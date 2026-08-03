// AdsProvider — UMP consent akışı + AdMob SDK initialize + canRequestAds context.
// Expo Go / Web'de tamamen pasif (children'ı olduğu gibi render eder, sdk yok).

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { adsEnabled } from "./adConfig";
import { getAdsSdk } from "./sdk";

interface AdsContextValue {
  canRequestAds: boolean;
  adsEnabled: boolean;
}

const AdsContext = createContext<AdsContextValue>({
  canRequestAds: false,
  adsEnabled: false,
});

export function useAds(): AdsContextValue {
  return useContext(AdsContext);
}

export function AdsProvider({ children }: PropsWithChildren) {
  const [canRequestAds, setCanRequestAds] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!adsEnabled) return;
    if (started.current) return;
    started.current = true;

    let alive = true;

    (async () => {
      const sdk = getAdsSdk();
      if (!sdk) return;

      try {
        // Her açılışta güncel UMP politikasını kontrol eder; gerekiyorsa
        // consent formunu gösterir. EEA/UK dışında sessizce tamamlanır.
        await sdk.AdsConsent.gatherConsent();
      } catch (e) {
        console.warn("[ads] UMP gatherConsent failed", e);
      }

      let allowed = false;
      try {
        const info = await sdk.AdsConsent.getConsentInfo();
        allowed = !!info.canRequestAds;
      } catch (e) {
        console.warn("[ads] getConsentInfo failed", e);
      }

      if (!alive || !allowed) return;

      try {
        await sdk.mobileAds().initialize();
        if (alive) setCanRequestAds(true);
      } catch (e) {
        console.warn("[ads] mobileAds initialize failed", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <AdsContext.Provider value={{ canRequestAds, adsEnabled }}>
      {children}
    </AdsContext.Provider>
  );
}
