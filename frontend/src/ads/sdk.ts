// AdMob SDK bridge — Expo Go/Web'de native modül yüklenmesin diye lazy require.
// `adsEnabled` false ise hiçbir zaman gerçek SDK'yı import etmeyiz; bu sayede
// önizleme (web) ve Expo Go çökme olmadan çalışmaya devam eder.

import { adsEnabled } from "./adConfig";

export interface ConsentInfo {
  canRequestAds: boolean;
  // UMP: AB/İngiltere kullanıcılarının onay tercihlerini SONRADAN
  // değiştirebilmesi için "Gizlilik Seçenekleri" formu gerekiyor mu?
  privacyOptionsRequirementStatus?: string;
  status?: string;
}

type AdsConsentModule = {
  gatherConsent: () => Promise<ConsentInfo>;
  getConsentInfo: () => Promise<ConsentInfo>;
  // AdMob politikası: onay veren kullanıcı tercihini geri alabilmeli.
  showPrivacyOptionsForm?: () => Promise<ConsentInfo>;
  reset?: () => void;
  PrivacyOptionsRequirementStatus?: Record<string, string>;
};

type MobileAdsModule = {
  initialize: () => Promise<unknown>;
  setRequestConfiguration?: (config: object) => Promise<unknown>;
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
    error?: Error | null;
};
  TestIds: { BANNER: string; INTERSTITIAL: string };
  // Uygulama acilis reklami (App Open) sinifi.
  AppOpenAd: unknown;
  // Ad olaylari (LOADED, ERROR, OPENED, CLOSED, CLICKED, PAID).
  AdEventType: Record<string, string>;
  MaxAdContentRating?: Record<string, string>;
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
      AppOpenAd: sdk.AppOpenAd,
      TestIds: sdk.TestIds,
      AdEventType: sdk.AdEventType,
      MaxAdContentRating: sdk.MaxAdContentRating,
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
