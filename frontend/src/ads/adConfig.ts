// AdMob konfigürasyonu — test/prod ID yönetimi + ortam algılama.
//
// - Varsayılan olarak Google'ın resmi TEST reklam ID'leri kullanılır (güvenli, para akışı yok).
// - Prod build'de EXPO_PUBLIC_AD_MODE=production ve gerçek ID'ler .env'den alınır.
// - Ana Sayfa (sayaç) ekranında REKLAM YOK — bu modülün sadece Zikirlerim/İstatistikler/
//   Ayarlar/Tesbihat tamamlanış gibi güvenli noktalarda kullanılması gerekir.

import Constants from "expo-constants";
import { Platform } from "react-native";

// Google resmi test ID'leri (Invertase/AdMob docs). Test ID'lere tıklamak güvenlidir.
const TEST_BANNER_ANDROID = "ca-app-pub-3940256099942544/6300978111";
const TEST_BANNER_IOS = "ca-app-pub-3940256099942544/2934735716";
const TEST_INTERSTITIAL_ANDROID = "ca-app-pub-3940256099942544/1033173712";
const TEST_INTERSTITIAL_IOS = "ca-app-pub-3940256099942544/4411468910";

const isWeb = Platform.OS === "web";

// Expo Go'da native module bulunmaz → reklam gösterilmez.
// executionEnvironment: "storeClient" = Expo Go, "standalone"/"bare" = dev/prod build.
const isExpoGo = Constants.executionEnvironment === "storeClient";

// Reklamlar sadece gerçek native build'de (dev client veya store build) etkindir.
export const adsEnabled = !isWeb && !isExpoGo;

const production = process.env.EXPO_PUBLIC_AD_MODE === "production";
export const isProductionAds = production;

const androidBanner =
  process.env.EXPO_PUBLIC_ANDROID_BANNER_ID || TEST_BANNER_ANDROID;
const iosBanner = process.env.EXPO_PUBLIC_IOS_BANNER_ID || TEST_BANNER_IOS;
const androidInter =
  process.env.EXPO_PUBLIC_ANDROID_INTERSTITIAL_ID || TEST_INTERSTITIAL_ANDROID;
const iosInter =
  process.env.EXPO_PUBLIC_IOS_INTERSTITIAL_ID || TEST_INTERSTITIAL_IOS;

// Prod modunda test ID kullanmaya çalışırsak sessizce test'e düşmeyip uyarı loglarız.
// (Gerçek ID'ler .env'den EXPO_PUBLIC_* olarak sağlanmalı.)
export const bannerUnitId = production
  ? Platform.OS === "ios"
    ? iosBanner
    : androidBanner
  : Platform.OS === "ios"
  ? TEST_BANNER_IOS
  : TEST_BANNER_ANDROID;

export const interstitialUnitId = production
  ? Platform.OS === "ios"
    ? iosInter
    : androidInter
  : Platform.OS === "ios"
  ? TEST_INTERSTITIAL_IOS
  : TEST_INTERSTITIAL_ANDROID;

// İnterstitial cooldown — kullanıcıyı rahatsız etmemek için minimum 10 dk.
export const INTERSTITIAL_COOLDOWN_MS = 10 * 60 * 1000;

// Consent form içeriği için debug bilgisi (yalnızca dev'de yararlı)
export const adDebugInfo = {
  adsEnabled,
  isExpoGo,
  isWeb,
  production,
  bannerUnitId,
  interstitialUnitId,
};
