// useRespectfulInterstitial — Tesbihat tamamlanınca vs. saygılı interstitial.
// - En az 10 dk cooldown
// - Hazır değilse akışı bekletmez, sessizce continueAction() çağırır
// - Expo Go / Web'de tamamen pasif

import { useCallback, useEffect, useRef } from "react";

import { interstitialUnitId, INTERSTITIAL_COOLDOWN_MS } from "./adConfig";
import { useAds } from "./AdsProvider";
import { getAdsSdk } from "./sdk";

export function useRespectfulInterstitial(): (
  continueAction?: () => void
) => Promise<void> {
  const { canRequestAds, adsEnabled } = useAds();
  const sdk = getAdsSdk();
  const lastShown = useRef(0);

  // Interstitial state — SDK yoksa undefined
  const interstitial = sdk?.useInterstitialAd?.(interstitialUnitId) as
    | {
        isLoaded: boolean;
        load: () => void;
        show: () => Promise<void>;
      }
    | undefined;

  useEffect(() => {
    if (!adsEnabled || !canRequestAds || !interstitial) return;
    interstitial.load();
  }, [adsEnabled, canRequestAds, interstitial]);

  return useCallback(
    async (continueAction?: () => void) => {
      const now = Date.now();
      const cooled = now - lastShown.current >= INTERSTITIAL_COOLDOWN_MS;

      if (!adsEnabled || !canRequestAds || !interstitial || !interstitial.isLoaded || !cooled) {
        continueAction?.();
        return;
      }

      lastShown.current = now;
      try {
        await interstitial.show();
      } catch (e) {
        console.warn("[ads] interstitial show failed", e);
      }
      continueAction?.();
    },
    [adsEnabled, canRequestAds, interstitial]
  );
}
