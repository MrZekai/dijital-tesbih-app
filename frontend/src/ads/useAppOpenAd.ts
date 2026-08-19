// useAppOpenAd — App Open reklam yöneticisi.
//
// v1.0.20 Play Store / UX düzeltmesi:
// - Cold-start reklamı yalnız native splash/loading aşamasında gösterilebilir.
// - Ana içerik açıldıktan sonra geç yüklenen reklam cold-start gerekçesiyle
//   ASLA ekrana bindirilmez; yalnız sonraki gerçek foreground fırsatı için tutulur.
// - UMP formu bitmeden cold-start reklamı yüklenmez/gösterilmez.
// - Splash bekleme süresi sınırlıdır; reklam/consent ağı uygulamayı kilitlemez.

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

import {
  APP_OPEN_COLD_START_MAX_WAIT_MS,
  APP_OPEN_COOLDOWN_MS,
  APP_OPEN_MAX_CACHE_MS,
  adsEnabled,
  appOpenUnitId,
} from "./adConfig";
import { useAds } from "./AdsProvider";
import { getAdsSdk } from "./sdk";

type AdInstance = {
  load: () => void;
  show: () => Promise<void>;
  loaded: boolean;
  addAdEventListener: (
    type: string,
    listener: (err?: unknown) => void
  ) => () => void;
  removeAllListeners: () => void;
};

interface UseAppOpenAdOptions {
  /** Root layout true verir; splash yalnız cold-start fırsatı bitince kapanır. */
  gateColdStart?: boolean;
}

export function useAppOpenAd(
  { gateColdStart = false }: UseAppOpenAdOptions = {}
) {
  const { canRequestAds, consentReady } = useAds();

  const [coldStartSettled, setColdStartSettled] = useState(
    !gateColdStart || !adsEnabled
  );
  const coldStartSettledRef = useRef(!gateColdStart || !adsEnabled);
  const coldStartShowingRef = useRef(false);

  const adRef = useRef<AdInstance | null>(null);
  const cleanupsRef = useRef<(() => void)[]>([]);
  const loadedAtRef = useRef(0);
  const isLoadingRef = useRef(false);
  const isShowingRef = useRef(false);
  const lastShownRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const loadRef = useRef<() => void>(() => {});

  const settleColdStart = useCallback((reason: string, applyCooldown = false) => {
    if (coldStartSettledRef.current) return;
    coldStartSettledRef.current = true;
    if (applyCooldown && lastShownRef.current === 0) {
      // Ana içerik açıldıktan hemen sonra ilk background→foreground dönüşünde
      // geç yüklenmiş reklamın patlamasını önler.
      lastShownRef.current = Date.now();
    }
    console.log(`[ads:app-open] cold-start tamamlandı (${reason})`);
    setColdStartSettled(true);
  }, []);

  const clearListeners = useCallback(() => {
    cleanupsRef.current.forEach((cleanup) => {
      try {
        cleanup();
      } catch {
        // ignore
      }
    });
    cleanupsRef.current = [];
  }, []);

  const discardAd = useCallback(() => {
    clearListeners();
    try {
      adRef.current?.removeAllListeners?.();
    } catch {
      // ignore
    }
    adRef.current = null;
    loadedAtRef.current = 0;
    isLoadingRef.current = false;
  }, [clearListeners]);

  const isAdUsable = useCallback(() => {
    const ad = adRef.current;
    if (!ad?.loaded) return false;
    if (Date.now() - loadedAtRef.current > APP_OPEN_MAX_CACHE_MS) return false;
    return true;
  }, []);

  const show = useCallback(
    (reason: string, isColdStart = false) => {
      const ad = adRef.current;
      if (!ad || isShowingRef.current || !isAdUsable()) return false;

      isShowingRef.current = true;
      coldStartShowingRef.current = isColdStart;
      lastShownRef.current = Date.now();
      console.log(`[ads:app-open] showing (${reason})`);

      ad.show().catch((e) => {
        isShowingRef.current = false;
        console.warn("[ads:app-open] show failed", e);
        if (coldStartShowingRef.current) {
          coldStartShowingRef.current = false;
          settleColdStart("show hatası", true);
        }
      });
      return true;
    },
    [isAdUsable, settleColdStart]
  );

  const load = useCallback(() => {
    if (!adsEnabled || !canRequestAds) return;
    if (isLoadingRef.current || isShowingRef.current) return;

    // Hazır ama bayat reklamı çöpe at; taze ise yeni istek yapma.
    if (adRef.current?.loaded && !isAdUsable()) discardAd();
    if (isAdUsable()) return;

    const sdk = getAdsSdk();
    if (!sdk?.AppOpenAd || !sdk?.AdEventType) {
      console.warn("[ads:app-open] SDK export bulunamadı");
      settleColdStart("SDK yok", true);
      return;
    }

    discardAd();
    isLoadingRef.current = true;

    try {
      const AppOpenAd = sdk.AppOpenAd as {
        createForAdRequest: (unitId: string, opts?: object) => AdInstance;
      };
      const ad = AppOpenAd.createForAdRequest(appOpenUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });
      adRef.current = ad;
      const AdEventType = sdk.AdEventType;

      const offLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        isLoadingRef.current = false;
        loadedAtRef.current = Date.now();
        console.log(`[ads:app-open] LOADED unitId=${appOpenUnitId}`);

        // KRİTİK: yalnız splash/loading kapısı hâlâ açıksa cold-start göster.
        if (
          gateColdStart &&
          !coldStartSettledRef.current &&
          AppState.currentState === "active"
        ) {
          if (!show("soğuk açılış/loading", true)) {
            settleColdStart("cold-start gösterilemedi", true);
          }
        }
      });

      const offError = ad.addAdEventListener(AdEventType.ERROR, (err) => {
        isLoadingRef.current = false;
        const e = err as { code?: string; message?: string } | undefined;
        console.warn(
          `[ads:app-open] ERROR code=${e?.code ?? "?"} message="${
            e?.message ?? String(err)
          }" unitId=${appOpenUnitId}`
        );
        if (!coldStartSettledRef.current) {
          settleColdStart("yükleme hatası", true);
        }
      });

      const offOpened = ad.addAdEventListener(AdEventType.OPENED, () => {
        isShowingRef.current = true;
        console.log("[ads:app-open] OPENED");
      });

      const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        const wasColdStart = coldStartShowingRef.current;
        coldStartShowingRef.current = false;
        isShowingRef.current = false;
        console.log("[ads:app-open] CLOSED");

        discardAd();
        if (wasColdStart) settleColdStart("reklam kapandı");

        // Bir sonraki gerçek foreground fırsatı için sessizce preload et.
        setTimeout(() => loadRef.current(), 0);
      });

      cleanupsRef.current = [offLoaded, offError, offOpened, offClosed];
      console.log(`[ads:app-open] load() unitId=${appOpenUnitId}`);
      ad.load();
    } catch (e) {
      isLoadingRef.current = false;
      console.warn("[ads:app-open] load setup threw", e);
      if (!coldStartSettledRef.current) settleColdStart("yükleme kurulamadı", true);
    }
  }, [
    canRequestAds,
    discardAd,
    gateColdStart,
    isAdUsable,
    settleColdStart,
    show,
  ]);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // Consent değerlendirmesi tamamlanınca reklam hakkı yoksa splash'i reklam
  // için bekletmenin anlamı yok. Varsa yüklemeyi başlat.
  useEffect(() => {
    if (!adsEnabled) {
      settleColdStart("reklamlar kapalı");
      return;
    }
    if (!consentReady) return;
    if (!canRequestAds) {
      settleColdStart("UMP reklam isteğine izin vermiyor");
      return;
    }
    load();
  }, [canRequestAds, consentReady, load, settleColdStart]);

  // Cold-start için sert üst sınır. İnternet/UMP/AdMob hiçbir koşulda
  // uygulamanın açılmasını süresiz bloke edemez. Süre dolunca ana içerik
  // açılır ve sonradan gelen LOADED olayı cold-start reklamı göstermez.
  useEffect(() => {
    if (!gateColdStart || coldStartSettledRef.current) return;
    const timer = setTimeout(() => {
      if (isShowingRef.current && coldStartShowingRef.current) return;
      settleColdStart("bekleme süresi doldu", true);
    }, APP_OPEN_COLD_START_MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, [gateColdStart, settleColdStart]);

  // Gerçek background → foreground dönüşü. Cold-start splash kapısı bitmeden
  // bu yol reklam göstermeye çalışmaz; consent form/reklam olaylarıyla yarışmaz.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const cameToForeground =
        !!appStateRef.current.match(/inactive|background/) && next === "active";
      appStateRef.current = next;
      if (!cameToForeground || !coldStartSettledRef.current) return;
      if (isShowingRef.current || !canRequestAds) return;

      const sinceLast = Date.now() - lastShownRef.current;
      if (lastShownRef.current > 0 && sinceLast < APP_OPEN_COOLDOWN_MS) return;

      if (!show("öne geldi")) loadRef.current();
    });
    return () => sub.remove();
  }, [canRequestAds, show]);

  useEffect(() => {
    return () => discardAd();
  }, [discardAd]);

  return { coldStartSettled };
}
