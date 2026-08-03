// AdMob SDK bridge — Expo Go/Web'de native modül yüklenmesin diye lazy require.
// `adsEnabled` false ise hiçbir zaman gerçek SDK'yı import etmeyiz; bu sayede
// önizleme (web) ve Expo Go çökme olmadan çalışmaya devam eder.

import { adsEnabled } from "./adConfig";

type AdsConsentModule = {
  gatherConsent: () => Promise<unknown>;
  getConsentInfo: () => Promise<{ canRequestAds: boolean }>;
};

type MobileAdsModule = {
  initialize: () => Promise<unknown>;
};

interface AdsSdk {
  mobileAds: () => MobileAdsModule;
  AdsConsent: AdsConsentModule;
  BannerAd: unknown;
  BannerAdSize: Record<string, string>;
  useForeground: (cb: () => void) => void;
  useInterstitialAd: (
    unitId: string
  ) => {
    isLoaded: boolean;
    load: () => void;
    show: () => Promise<void>;
  };
  TestIds: { BANNER: string; INTERSTITIAL: string };
}

let cached: AdsSdk | null = null;

export function getAdsSdk(): AdsSdk | null {
  if (!adsEnabled) return null;
  if (cached) return cached;
  try {
    // Dinamik require: native modül yalnızca gerçek native build'de mevcuttur.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sdk = require("react-native-google-mobile-ads");
    cached = {
      mobileAds: sdk.default,
      AdsConsent: sdk.AdsConsent,
      BannerAd: sdk.BannerAd,
      BannerAdSize: sdk.BannerAdSize,
      useForeground: sdk.useForeground,
      useInterstitialAd: sdk.useInterstitialAd,
      TestIds: sdk.TestIds,
    };
    return cached;
  } catch (e) {
    // Expo Go / Web / native modül eksik ortamlar
    console.warn(
      "[ads] react-native-google-mobile-ads yüklenemedi (Expo Go veya Web olabilir):",
      (e as Error).message
    );
    return null;
  }
}
