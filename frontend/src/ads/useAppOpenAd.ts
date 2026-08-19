// useAppOpenAd — Google AdMob App Open yaşam döngüsü yöneticisi.
//
// v1.0.21 policy-aligned reklam modeli:
// - Cold start: yalnız native splash/loading kapısı açıkken gösterilir.
// - Resume: yalnız kullanıcı uygulamadan anlamlı süre uzak kaldıysa, reklam
//   ÖNCEDEN yüklüyse ve yerel cooldown dolduysa gösterilir.
// - Resume reklamı gösterilmeden önce root seviyesinde loading gate açılır;
//   banner native view unmount edilir, sonra App Open gösterilir.
// - Resume anında reklam hazır değilse SONRADAN kullanıcının üstüne düşmez;
//   yalnız bir sonraki uygun fırsat için preload edilir.
// - Her App Open gösteriminden sonra kullanılan reklam nesnesi atılır ve yeni
//   bir nesne preload edilir; stale/reused full-screen ad yoktur.
// - Reklamın kendi OPENED/CLOSED/CLICKED AppState geçişleri yeni bir resume
//   fırsatı olarak değerlendirilmez.
// - Son gösterim zamanı AsyncStorage'da tutulur; process yeniden başlasa bile
//   kısa aralıklarla tekrar tekrar tam ekran reklam gösterilmez.
// - UMP izin vermeden hiçbir reklam isteği yapılmaz.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

import {
  APP_OPEN_COLD_START_MAX_WAIT_MS,
  APP_OPEN_MAX_CACHE_MS,
  APP_OPEN_MIN_INTERVAL_MS,
  APP_OPEN_RESUME_MIN_BACKGROUND_MS,
  adsEnabled,
  appOpenUnitId,
} from "./adConfig";
import { useAds } from "./AdsProvider";
import { getAdsSdk } from "./sdk";

const LAST_SHOWN_KEY = "@zikirhane/app-open-last-shown-v1";
const APP_OPEN_ACTIVITY_GUARD_MS = 1500;
const RESUME_GATE_SETTLE_MS = 120;

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

type LoadPurpose = "cold-start" | "preload";
type ShowPurpose = "cold-start" | "resume";

interface UseAppOpenAdOptions {
  gateColdStart?: boolean;
}

export function useAppOpenAd(
  { gateColdStart = false }: UseAppOpenAdOptions = {}
) {
  const {
    canRequestAds,
    consentReady,
    setFullScreenAdActive,
  } = useAds();

  const [coldStartSettled, setColdStartSettled] = useState(
    !gateColdStart || !adsEnabled
  );
  const [resumeGateVisible, setResumeGateVisible] = useState(false);
  const [lastShownReady, setLastShownReady] = useState(false);

  const coldStartSettledRef = useRef(!gateColdStart || !adsEnabled);
  const resumeGateVisibleRef = useRef(false);
  const adRef = useRef<AdInstance | null>(null);
  const cleanupsRef = useRef<(() => void)[]>([]);
  const loadedAtRef = useRef(0);
  const loadPurposeRef = useRef<LoadPurpose>("preload");
  const showPurposeRef = useRef<ShowPurpose | null>(null);
  const isLoadingRef = useRef(false);
  const isShowingRef = useRef(false);
  const shownTimestampRecordedRef = useRef(false);
  const lastShownAtRef = useRef(0);
  const lastShownReadyRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundAtRef = useRef(0);
  const ignoreAppStateUntilRef = useRef(0);
  const suppressNextResumeRef = useRef(false);
  const loadRef = useRef<(purpose: LoadPurpose) => void>(() => {});
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setResumeGate = useCallback((visible: boolean) => {
    resumeGateVisibleRef.current = visible;
    setResumeGateVisible(visible);
  }, []);

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
    loadedAtRef.current = 0;
    isLoadingRef.current = false;
    shownTimestampRecordedRef.current = false;
  }, [clearListeners]);

  const isAdUsable = useCallback(() => {
    const ad = adRef.current;
    if (!ad?.loaded) return false;
    if (!loadedAtRef.current) return false;
    if (Date.now() - loadedAtRef.current > APP_OPEN_MAX_CACHE_MS) return false;
    return true;
  }, []);

  const hasLocalCooldown = useCallback(() => {
    if (!lastShownReadyRef.current) return false;
    if (!lastShownAtRef.current) return true;
    return Date.now() - lastShownAtRef.current >= APP_OPEN_MIN_INTERVAL_MS;
  }, []);

  const persistShownNow = useCallback(() => {
    if (shownTimestampRecordedRef.current) return;
    shownTimestampRecordedRef.current = true;
    const now = Date.now();
    lastShownAtRef.current = now;
    lastShownReadyRef.current = true;
    AsyncStorage.setItem(LAST_SHOWN_KEY, String(now)).catch(() => {});
  }, []);

  const finishShowing = useCallback(
    (reason: string) => {
      const purpose = showPurposeRef.current;
      showPurposeRef.current = null;
      isShowingRef.current = false;
      ignoreAppStateUntilRef.current = Date.now() + APP_OPEN_ACTIVITY_GUARD_MS;

      discardAd();
      setFullScreenAdActive(false);

      if (purpose === "cold-start") {
        settleColdStart(reason);
      }
      if (purpose === "resume") {
        setResumeGate(false);
      }

      // Kullanılan App Open nesnesini ASLA yeniden kullanma. Bir sonraki uygun
      // açılış/app-switch için taze reklam nesnesini sessizce preload et.
      if (adsEnabled && canRequestAds) {
        setTimeout(() => loadRef.current("preload"), 500);
      }
    },
    [canRequestAds, discardAd, setFullScreenAdActive, setResumeGate, settleColdStart]
  );

  const showAd = useCallback(
    (purpose: ShowPurpose) => {
      const ad = adRef.current;
      if (
        !ad ||
        !isAdUsable() ||
        isShowingRef.current ||
        AppState.currentState !== "active" ||
        !hasLocalCooldown()
      ) {
        return false;
      }

      isShowingRef.current = true;
      showPurposeRef.current = purpose;
      backgroundAtRef.current = 0;
      ignoreAppStateUntilRef.current = Date.now() + APP_OPEN_ACTIVITY_GUARD_MS;
      setFullScreenAdActive(true);
      console.log(`[ads:app-open] showing (${purpose})`);

      ad.show().catch((e) => {
        console.warn("[ads:app-open] show failed", e);
        finishShowing("show hatası");
      });
      return true;
    },
    [
      finishShowing,
      hasLocalCooldown,
      isAdUsable,
      setFullScreenAdActive,
    ]
  );

  const load = useCallback(
    (purpose: LoadPurpose) => {
      if (!adsEnabled || !canRequestAds) return;
      if (isLoadingRef.current || isShowingRef.current) return;

      if (adRef.current?.loaded && !isAdUsable()) discardAd();
      if (isAdUsable()) return;

      const sdk = getAdsSdk();
      if (!sdk?.AppOpenAd || !sdk?.AdEventType) {
        console.warn("[ads:app-open] SDK export bulunamadı");
        if (purpose === "cold-start") settleColdStart("SDK yok");
        return;
      }

      discardAd();
      loadPurposeRef.current = purpose;
      isLoadingRef.current = true;

      try {
        const AppOpenAd = sdk.AppOpenAd as {
          createForAdRequest: (unitId: string, opts?: object) => AdInstance;
        };
        const ad = AppOpenAd.createForAdRequest(appOpenUnitId, {
          requestNonPersonalizedAdsOnly: false,
        });
        adRef.current = ad;
        const AdEventType = sdk.AdEventType as Record<string, string>;

        const offLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
          isLoadingRef.current = false;
          loadedAtRef.current = Date.now();
          console.log(
            `[ads:app-open] LOADED purpose=${loadPurposeRef.current} unitId=${appOpenUnitId}`
          );

          if (loadPurposeRef.current !== "cold-start") return;

          // Cold-start reklamı yalnız splash/loading kapısı hâlâ açıksa
          // gösterilebilir. Geç yüklenirse cache olarak tutulur; içerik üstüne
          // sonradan bindirilmez.
          if (
            coldStartSettledRef.current ||
            AppState.currentState !== "active" ||
            !hasLocalCooldown()
          ) {
            settleColdStart("cold-start fırsatı geçti/cooldown");
            return;
          }

          if (!showAd("cold-start")) {
            settleColdStart("cold-start gösterilemedi");
          }
        });

        const offError = ad.addAdEventListener(AdEventType.ERROR, (err) => {
          const failedPurpose = loadPurposeRef.current;
          isLoadingRef.current = false;
          const e = err as { code?: string; message?: string } | undefined;
          console.warn(
            `[ads:app-open] ERROR purpose=${failedPurpose} code=${
              e?.code ?? "?"
            } message="${e?.message ?? String(err)}" unitId=${appOpenUnitId}`
          );
          discardAd();
          setFullScreenAdActive(false);
          setResumeGate(false);
          if (failedPurpose === "cold-start") {
            settleColdStart("yükleme hatası");
          }
        });

        const offOpened = ad.addAdEventListener(AdEventType.OPENED, () => {
          isShowingRef.current = true;
          ignoreAppStateUntilRef.current = Date.now() + APP_OPEN_ACTIVITY_GUARD_MS;
          setFullScreenAdActive(true);
          persistShownNow();
          console.log("[ads:app-open] OPENED");
        });

        const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
          console.log("[ads:app-open] CLOSED");
          finishShowing("reklam kapandı");
        });

        const eventCleanups = [offLoaded, offError, offOpened, offClosed];
        if (AdEventType.CLICKED) {
          const offClicked = ad.addAdEventListener(AdEventType.CLICKED, () => {
            // Google: kullanıcı App Open reklamına tıklayıp dışarı gittikten sonra
            // uygulamaya dönerse yeni bir App Open ile karşılanmamalı.
            suppressNextResumeRef.current = true;
            ignoreAppStateUntilRef.current = Date.now() + APP_OPEN_ACTIVITY_GUARD_MS;
            console.log("[ads:app-open] CLICKED; sonraki resume bastırıldı");
          });
          eventCleanups.push(offClicked);
        }

        cleanupsRef.current = eventCleanups;
        console.log(`[ads:app-open] load(${purpose}) unitId=${appOpenUnitId}`);
        ad.load();
      } catch (e) {
        isLoadingRef.current = false;
        console.warn("[ads:app-open] load setup threw", e);
        discardAd();
        setFullScreenAdActive(false);
        setResumeGate(false);
        if (purpose === "cold-start") {
          settleColdStart("yükleme kurulamadı");
        }
      }
    },
    [
      canRequestAds,
      discardAd,
      finishShowing,
      hasLocalCooldown,
      isAdUsable,
      persistShownNow,
      setFullScreenAdActive,
      setResumeGate,
      settleColdStart,
      showAd,
    ]
  );

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // Son gösterim zamanını processler arasında koru. Bu değer okunana kadar
  // tam ekran reklam göstermemek, hızlı kapat-aç döngülerinde aşırı sıklığı
  // önler.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LAST_SHOWN_KEY)
      .then((value) => {
        if (cancelled) return;
        const parsed = Number(value ?? 0);
        lastShownAtRef.current = Number.isFinite(parsed) ? parsed : 0;
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          lastShownReadyRef.current = true;
          setLastShownReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // UMP değerlendirmesi tamamlandıktan ve yerel cooldown bilgisi okunduktan
  // sonra cold-start fırsatını değerlendir.
  useEffect(() => {
    if (!adsEnabled) {
      settleColdStart("reklamlar kapalı");
      return;
    }
    if (!consentReady || !lastShownReady) return;
    if (!canRequestAds) {
      settleColdStart("UMP reklam isteğine izin vermiyor");
      return;
    }
    if (!hasLocalCooldown()) {
      settleColdStart("yerel sıklık sınırı");
      load("preload");
      return;
    }
    load("cold-start");
  }, [
    canRequestAds,
    consentReady,
    hasLocalCooldown,
    lastShownReady,
    load,
    settleColdStart,
  ]);

  // Cold start asla ağ yüzünden kilitlenmez. Süre dolduysa splash açılır;
  // geç gelen reklam yalnız cache olarak kalabilir, kullanıcıya sonradan düşmez.
  useEffect(() => {
    if (!gateColdStart || coldStartSettledRef.current) return;
    settleTimerRef.current = setTimeout(() => {
      if (showPurposeRef.current === "cold-start" && isShowingRef.current) return;
      settleColdStart("bekleme süresi doldu");
      if (canRequestAds && !isAdUsable()) loadRef.current("preload");
    }, APP_OPEN_COLD_START_MAX_WAIT_MS);
    return () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    };
  }, [canRequestAds, gateColdStart, isAdUsable, settleColdStart]);

  // Cold-start kapısı kapandıktan sonra, bir sonraki anlamlı app-switch için
  // reklamı önceden hazırla. "Dönünce yükle ve sonra göster" YAPILMAZ.
  useEffect(() => {
    if (!coldStartSettled || !canRequestAds || !consentReady) return;
    load("preload");
  }, [canRequestAds, coldStartSettled, consentReady, load]);

  // Google App Open'ın desteklediği app-switch davranışı, fakat güvenlik
  // kapılarıyla: minimum background süresi + minimum tam-ekran gösterim aralığı
  // + sadece ÖNCEDEN YÜKLENMİŞ reklam + reklamın kendi lifecycle'ını bastırma.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const now = Date.now();
      const prev = appStateRef.current;
      appStateRef.current = next;

      // App Open full-screen Activity'sinin veya reklam tıklamasının kendi
      // AppState değişikliklerini gerçek kullanıcı app-switch'i sanma.
      if (isShowingRef.current || now < ignoreAppStateUntilRef.current) {
        return;
      }

      if (next === "background" || next === "inactive") {
        if (!backgroundAtRef.current) backgroundAtRef.current = now;
        return;
      }

      const cameToForeground =
        !!prev.match(/inactive|background/) && next === "active";
      if (!cameToForeground) return;

      if (suppressNextResumeRef.current) {
        suppressNextResumeRef.current = false;
        backgroundAtRef.current = 0;
        if (canRequestAds && !isAdUsable()) loadRef.current("preload");
        return;
      }

      const backgroundAt = backgroundAtRef.current;
      backgroundAtRef.current = 0;
      const awayFor = backgroundAt ? now - backgroundAt : 0;

      if (
        !coldStartSettledRef.current ||
        !canRequestAds ||
        awayFor < APP_OPEN_RESUME_MIN_BACKGROUND_MS ||
        !hasLocalCooldown()
      ) {
        if (canRequestAds && !isAdUsable()) loadRef.current("preload");
        return;
      }

      // Reklam resume anında hazır değilse sonradan gösterme. Kullanıcı doğrudan
      // içeriğe döner; reklam yalnız bir sonraki fırsat için hazırlanır.
      if (!isAdUsable()) {
        loadRef.current("preload");
        return;
      }

      // Önce loading gate render edilir ve banner unmount edilir; ardından
      // App Open gösterilir. Böylece reklam başka bir reklamın üstüne binmez.
      setResumeGate(true);
      setFullScreenAdActive(true);
      resumeShowTimerRef.current = setTimeout(() => {
        resumeShowTimerRef.current = null;
        if (
          AppState.currentState !== "active" ||
          !resumeGateVisibleRef.current ||
          !hasLocalCooldown() ||
          !isAdUsable() ||
          !showAd("resume")
        ) {
          setResumeGate(false);
          setFullScreenAdActive(false);
          if (canRequestAds && !isAdUsable()) loadRef.current("preload");
        }
      }, RESUME_GATE_SETTLE_MS);
    });

    return () => sub.remove();
  }, [
    canRequestAds,
    hasLocalCooldown,
    isAdUsable,
    setFullScreenAdActive,
    setResumeGate,
    showAd,
  ]);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      if (resumeShowTimerRef.current) clearTimeout(resumeShowTimerRef.current);
      setFullScreenAdActive(false);
      discardAd();
    };
  }, [discardAd, setFullScreenAdActive]);

  return { coldStartSettled, resumeGateVisible };
}
