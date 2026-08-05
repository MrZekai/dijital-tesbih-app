// useRespectfulInterstitial — sekme gecislerinde / tesbihat sonrasi interstitial.
//
// TANI: Kullanici hicbir interstitial gormedigini bildirdi. Bunun uc olasi
// sebebi vardir:
//   1) `useInterstitialAd` yeni kurulusta ilk load'u tetiklemez; bunu
//      canRequestAds sonrasi manuel yapiyoruz.
//   2) Load basarili olsa bile isLoaded'e ulasmadan tabPress tetiklenmis
//      olabilir → sessizce continueAction() dondurup dusuyor.
//   3) AdMob no-fill (test ID icin nadir; prod ID icin coobbtcadgindan sik).
// Bu hook her hayat dongusu adimini konsola log'lar → kullanici gunlugu
// inceleyerek gercek sebebi ayirt edebilir.

import { useCallback, useEffect, useRef, useState } from "react";

import { interstitialUnitId, INTERSTITIAL_COOLDOWN_MS } from "./adConfig";
import { useAds } from "./AdsProvider";
import { getAdsSdk } from "./sdk";

export function useRespectfulInterstitial(): (
  continueAction?: () => void
) => Promise<void> {
  const { canRequestAds, adsEnabled } = useAds();
  const sdk = getAdsSdk();
  const lastShown = useRef(0);
  const [attempts, setAttempts] = useState(0);

  const interstitial = sdk?.useInterstitialAd?.(interstitialUnitId) as
    | {
        isLoaded: boolean;
        load: () => void;
        show: () => Promise<void>;
        error?: Error | null;
      }
    | undefined;

  // Yaslamalar: yukleme durumunu loglayalim.
  useEffect(() => {
    if (!adsEnabled) {
      console.log("[ads:interstitial] disabled (Expo Go/web)");
      return;
    }
    if (!canRequestAds) {
      console.log("[ads:interstitial] waiting for consent/init");
      return;
    }
    if (!interstitial) {
      console.warn("[ads:interstitial] hook returned undefined");
      return;
    }
    console.log(
      `[ads:interstitial] initial load unitId=${interstitialUnitId} attempts=${attempts}`
    );
    try {
      interstitial.load();
    } catch (e) {
      console.warn("[ads:interstitial] load threw", e);
    }
  }, [adsEnabled, canRequestAds, interstitial, attempts]);

  // isLoaded degistiginde log
  useEffect(() => {
    if (!interstitial) return;
    console.log(
      `[ads:interstitial] state isLoaded=${interstitial.isLoaded} error=${
        interstitial.error ? String(interstitial.error) : "none"
      }`
    );
  }, [interstitial?.isLoaded, interstitial?.error]);

  return useCallback(
    async (continueAction?: () => void) => {
      const now = Date.now();
      const sinceLast = now - lastShown.current;
      const cooled = sinceLast >= INTERSTITIAL_COOLDOWN_MS;

      // Neden gostermedigimizi acik ac diye log'luyoruz.
      if (!adsEnabled) {
        console.log("[ads:interstitial] skip: adsEnabled=false");
        continueAction?.();
        return;
      }
      if (!canRequestAds) {
        console.log("[ads:interstitial] skip: canRequestAds=false (consent bekleniyor)");
        continueAction?.();
        return;
      }
      if (!interstitial) {
        console.warn("[ads:interstitial] skip: hook undefined");
        continueAction?.();
        return;
      }
      if (!interstitial.isLoaded) {
        console.log(
          `[ads:interstitial] skip: not loaded yet (kod dogru, henuz yuklenmedi veya no-fill). error=${
            interstitial.error ? String(interstitial.error) : "none"
          }`
        );
        // Sonraki attempt icin load'u tekrar tetikle
        setAttempts((n) => n + 1);
        continueAction?.();
        return;
      }
      if (!cooled) {
        const remaining = Math.ceil(
          (INTERSTITIAL_COOLDOWN_MS - sinceLast) / 1000
        );
        console.log(
          `[ads:interstitial] skip: cooldown (kalan ${remaining}s / toplam ${
            INTERSTITIAL_COOLDOWN_MS / 1000
          }s)`
        );
        continueAction?.();
        return;
      }

      lastShown.current = now;
      console.log("[ads:interstitial] showing...");
      try {
        await interstitial.show();
        console.log("[ads:interstitial] shown & closed");
      } catch (e) {
        console.warn("[ads:interstitial] show failed", e);
      }
      // Sonraki gosterim icin yeniden yukle
      setAttempts((n) => n + 1);
      continueAction?.();
    },
    [adsEnabled, canRequestAds, interstitial]
  );
}
