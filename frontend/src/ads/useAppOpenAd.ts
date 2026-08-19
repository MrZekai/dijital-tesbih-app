// useAppOpenAd — App Open reklam yöneticisi.
//
// v1.0.21 kullanıcı deneyimi sertleştirmesi:
// - App Open YALNIZCA gerçek cold-start sırasında, native splash/loading
//   kapısı açıkken gösterilebilir.
// - Uygulama background -> foreground olduğunda App Open ASLA gösterilmez.
// - Cold-start reklamı kapandıktan sonra yeni App Open preload edilmez.
// - UMP formu bitmeden reklam yüklenmez/gösterilmez.
// - Splash bekleme süresi sınırlıdır; ağ/consent/reklam hatası açılışı kilitlemez.
//
// Bu politika bilinçlidir: banner reklamlar uygulama içinde çalışmaya devam eder,
// fakat uygulamaya geri dönüşte sorunlu/şaşırtıcı tam ekran reklam gösterilmez.

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import {
  APP_OPEN_COLD_START_MAX_WAIT_MS,
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
  const isLoadingRef = useRef(false);
  const isShowingRef = useRef(false);

  const settleColdStart = useCallback((reason: string) => {
    if (coldStartSettledRef.current) return;
    coldStartSettledRef.current = true;
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
    isLoadingRef.current = false;
  }, [clearListeners]);

  const showColdStartAd = useCallback(() => {
    const ad = adRef.current;
    if (
      !ad?.loaded ||
      isShowingRef.current ||
      coldStartSettledRef.current ||
      AppState.currentState !== "active"
    ) {
      return false;
    }

    isShowingRef.current = true;
    coldStartShowingRef.current = true;
    console.log("[ads:app-open] showing (cold-start/loading)");

    ad.show().catch((e) => {
      isShowingRef.current = false;
      coldStartShowingRef.current = false;
      console.warn("[ads:app-open] show failed", e);
      discardAd();
      settleColdStart("show hatası");
    });
    return true;
  }, [discardAd, settleColdStart]);

  const loadColdStartAd = useCallback(() => {
    // Cold-start kapısı bir kez kapandıktan sonra bu process/session içinde
    // App Open reklamı tekrar yüklenmez. Background -> foreground dönüşlerinde
    // bu fonksiyonun yeniden reklam hazırlaması özellikle engellenir.
    if (coldStartSettledRef.current) return;
    if (!adsEnabled || !canRequestAds) return;
    if (isLoadingRef.current || isShowingRef.current || adRef.current) return;

    const sdk = getAdsSdk();
    if (!sdk?.AppOpenAd || !sdk?.AdEventType) {
      console.warn("[ads:app-open] SDK export bulunamadı");
      settleColdStart("SDK yok");
      return;
    }

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
        console.log(`[ads:app-open] LOADED unitId=${appOpenUnitId}`);

        // Timeout/splash kapısı kapanmışsa veya kullanıcı yükleme sırasında
        // uygulamadan çıkmışsa reklamı daha sonra foreground'da göstermeyiz.
        if (
          coldStartSettledRef.current ||
          AppState.currentState !== "active"
        ) {
          discardAd();
          settleColdStart("cold-start fırsatı geçti");
          return;
        }

        if (!showColdStartAd()) {
          discardAd();
          settleColdStart("cold-start gösterilemedi");
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
        discardAd();
        settleColdStart("yükleme hatası");
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

        // KRİTİK v1.0.21: reklam kapanınca yalnız temizle. Yeni reklam
        // preload ETME; aynı session'daki foreground dönüşlerinde App Open yok.
        discardAd();
        if (wasColdStart) settleColdStart("reklam kapandı");
      });

      cleanupsRef.current = [offLoaded, offError, offOpened, offClosed];
      console.log(`[ads:app-open] load() unitId=${appOpenUnitId}`);
      ad.load();
    } catch (e) {
      isLoadingRef.current = false;
      console.warn("[ads:app-open] load setup threw", e);
      discardAd();
      settleColdStart("yükleme kurulamadı");
    }
  }, [canRequestAds, discardAd, settleColdStart, showColdStartAd]);

  // Consent değerlendirmesi tamamlanınca reklam hakkı yoksa splash'i reklam
  // için bekletmenin anlamı yok. Varsa yalnız cold-start reklamını yükle.
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
    loadColdStartAd();
  }, [canRequestAds, consentReady, loadColdStartAd, settleColdStart]);

  // Cold-start için sert üst sınır. İnternet/UMP/AdMob hiçbir koşulda
  // uygulamanın açılmasını süresiz bloke edemez. Süre dolunca reklam isteği
  // temizlenir; sonradan gelen bir reklam foreground dönüşünde gösterilemez.
  useEffect(() => {
    if (!gateColdStart || coldStartSettledRef.current) return;
    const timer = setTimeout(() => {
      if (isShowingRef.current && coldStartShowingRef.current) return;
      discardAd();
      settleColdStart("bekleme süresi doldu");
    }, APP_OPEN_COLD_START_MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, [discardAd, gateColdStart, settleColdStart]);

  // Bilinçli olarak AppState background -> foreground listener YOKTUR.
  // App Open yalnız bu hook'un ilk cold-start yaşam döngüsünde çalışır.

  useEffect(() => {
    return () => discardAd();
  }, [discardAd]);

  return { coldStartSettled };
}
