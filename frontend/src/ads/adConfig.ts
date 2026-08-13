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

// ─────────────────────────────────────────────────────────────────────────
// REKLAM ANA ANAHTARI (ADVERTISING MASTER SWITCH)
//
// Kapalı test (closed-testing) sürümü için reklamlar TAMAMEN pasiftir.
// TÜM reklam bileşenleri ve hook'ları (banner, interstitial, app-open,
// AdsProvider/UMP init, SDK require) bu TEK merkezi değeri okur.
//
// ADS_ENABLED = false iken:
//   - Banner yüklemesi yok → yerine statik yer tutucu gösterilir.
//   - Interstitial yükleme/gösterme yok.
//   - App Open yükleme/gösterme yok.
//   - AdMob ağ istekleri / native modül require'ı yok.
//   - Reklam olay dinleyicileri (event listeners) pasif.
//
// İleride production reklam yayınına geçildiğinde bu tek değeri `true`
// yapmak yeterlidir; tüm reklam altyapısı kod tabanında korunmaktadır.
export const ADS_ENABLED = false;

// Expo Go'da native module bulunmaz → reklam gösterilmez.
// executionEnvironment: "storeClient" = Expo Go, "standalone"/"bare" = dev/prod build.
const isExpoGo = Constants.executionEnvironment === "storeClient";

// Reklamlar yalnızca ANA ANAHTAR açıksa VE gerçek native build'de (dev client
// veya store build) etkindir. ADS_ENABLED=false iken hiçbir koşulda reklam
// isteği yapılmaz (getAdsSdk null döner → native SDK require bile edilmez).
export const adsEnabled = ADS_ENABLED && !isWeb && !isExpoGo;

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
  ADS_ENABLED,
  adsEnabled,
  isExpoGo,
  isWeb,
  production,
  bannerUnitId,
  interstitialUnitId,
};

// --- Uygulama acilis reklami (App Open) ---
const TEST_APP_OPEN_ANDROID = "ca-app-pub-3940256099942544/9257395921";
const TEST_APP_OPEN_IOS = "ca-app-pub-3940256099942544/5575463023";

export const appOpenUnitId = production
  ? Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_IOS_APP_OPEN_ID ?? TEST_APP_OPEN_IOS
    : process.env.EXPO_PUBLIC_ANDROID_APP_OPEN_ID ?? TEST_APP_OPEN_ANDROID
  : Platform.OS === "ios"
    ? TEST_APP_OPEN_IOS
    : TEST_APP_OPEN_ANDROID;

// Acilis reklami cok sik cikmasin: en az 4 dakika ara.
// (AdMob politikasi acisindan da onemli - asiri siklik ihlal sayilir.)
export const APP_OPEN_COOLDOWN_MS = 4 * 60 * 1000;
