// AdMob konfigürasyonu — YALNIZCA GERÇEK (production) reklam kimlikleri.
//
// v1.0.20
// ─────────────────────────────────────────────────────────────────────────
// ÖNEMLİ: Google'ın örnek/TEST reklam birimi kimlikleri bu kod tabanından
// TAMAMEN KALDIRILDI. Hiçbir dosyada test birimi sabiti bulunmuyor.
// Uygulama her ortamda (geliştirme dahil) yalnızca aşağıdaki gerçek
// reklam birimlerini kullanır.
//
// ┌───────────────────────────────────────────────────────────────────────┐
// │ KENDİ REKLAMINIZA TIKLAMAYIN                                          │
// │                                                                       │
// │ Test kimlikleri kaldırıldığı için geliştirme cihazında da GERÇEK      │
// │ reklamlar görünür. Kendi reklamınıza tıklamak AdMob'da "geçersiz      │
// │ trafik" sayılır ve hesabınız askıya alınabilir.                       │
// │                                                                       │
// │ GÜVENLİ YÖNTEM (Google'ın resmî önerisi): Cihazınızı "test cihazı"    │
// │ olarak tanımlayın. Bu yöntem GERÇEK reklam biriminizi kullanır ama    │
// │ o cihaza test reklamı sunar — yani sahte birim kimliğine gerek yok.   │
// │                                                                       │
// │ 1) Uygulamayı cihazda çalıştırın, logcat'te şuna benzer satırı bulun: │
// │    "Use RequestConfiguration.Builder().setTestDeviceIds(...)"         │
// │ 2) Oradaki kimliği .env dosyasına yazın:                              │
// │    EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS=33BE2250B43518CCDA7DE426D04EE231 │
// │    (birden fazla cihaz için virgülle ayırın)                          │
// │ 3) Bu değişken YAYIN build'inde BOŞ bırakılmalıdır.                   │
// └───────────────────────────────────────────────────────────────────────┘

import Constants from "expo-constants";
import { Platform } from "react-native";

// ── AdMob kimlikleri ────────────────────────────────────────────────────
// Uygulama kimliği app.json içinde de tanımlıdır:
//   plugins > react-native-google-mobile-ads > androidAppId
export const ADMOB_ANDROID_APP_ID = "ca-app-pub-1380972808968213~2930057843";

/** ÜRETİM banner reklam birimi (DEĞİŞTİRME). */
export const PROD_BANNER_UNIT_ID = "ca-app-pub-1380972808968213/1326176029";

/** ÜRETİM App Open reklam birimi (DEĞİŞTİRME). */
export const PROD_APP_OPEN_UNIT_ID = "ca-app-pub-1380972808968213/1789210450";

/**
 * Google'ın RESMÎ örnek reklam birimleri.
 * Yalnızca geliştirme/QA derlemelerinde kullanılır; canlı yayında ASLA.
 * Kaynak: developers.google.com/admob/android/test-ads
 */
const TEST_BANNER_UNIT_ID = "ca-app-pub-3940256099942544/9214589741";
const TEST_APP_OPEN_UNIT_ID = "ca-app-pub-3940256099942544/9257395921";
const TEST_INTERSTITIAL_UNIT_ID = "ca-app-pub-3940256099942544/1033173712";

// ─────────────────────────────────────────────────────────────────────────
// REKLAM ANA ANAHTARI (ADVERTISING MASTER SWITCH)
//
// Bu tek değer `false` yapılırsa tüm reklam altyapısı (banner / app-open /
// UMP init / native SDK require) devre dışı kalır.
export const ADS_ENABLED = true;

// Expo Go'da native module bulunmaz → reklam gösterilmez.
// executionEnvironment: "storeClient" = Expo Go, "standalone"/"bare" = dev/prod build.
const isExpoGo = Constants.executionEnvironment === "storeClient";

// Reklamlar YALNIZCA Android'de etkindir.
// Gerekçe: AdMob panelinde bu uygulama için yalnızca ANDROID uygulaması ve
// Android reklam birimleri oluşturulmuş durumda. Test kimlikleri de
// kaldırıldığı için iOS'ta gösterilecek geçerli bir birim YOKTUR; iOS'ta
// reklam istemek yerine reklam altyapısı tamamen pasif bırakılır.
// (İleride iOS yayını yapılacaksa: AdMob'da iOS uygulaması + birimleri
// oluşturulmalı, kimlikler buraya eklenmeli ve bu koşul güncellenmelidir.)
export const adsEnabled = ADS_ENABLED && !isExpoGo && Platform.OS === "android";

/**
 * ÜRETİM mi, GELİŞTİRME/QA mi?
 *
 * `__DEV__` Metro/debug derlemelerinde `true`, release derlemelerinde
 * `false`'tur. Ayrıca QA'nın release yapılandırmasında da test reklamı
 * kullanabilmesi için açık bir kaçış kapısı bırakıldı:
 *   EXPO_PUBLIC_ADS_MODE=test
 *
 * KURAL (talimat md. 9): geliştirme ve QA derlemelerinde YALNIZCA Google'ın
 * test birimleri kullanılır; canlı birimler SADECE production profilinde
 * çalışır. Böylece "kendi reklamına tıklama → geçersiz trafik" riski
 * tamamen ortadan kalkar.
 *
 * YAYIN ÖNCESİ KONTROL: `EXPO_PUBLIC_ADS_MODE` production build'inde
 * TANIMSIZ olmalıdır (bkz. RELEASE_COMPATIBILITY_CHECKLIST.md).
 */
const forcedMode = (process.env.EXPO_PUBLIC_ADS_MODE || "").trim().toLowerCase();
export const isProductionAds =
  forcedMode === "production" ? true : forcedMode === "test" ? false : !__DEV__;

/** Banner reklam birimi — sekme çubuğunun üstündeki sabit alan. */
export const bannerUnitId = isProductionAds
  ? PROD_BANNER_UNIT_ID
  : TEST_BANNER_UNIT_ID;

/** Uygulama Açılışı (App Open) reklam birimi. */
export const appOpenUnitId = isProductionAds
  ? PROD_APP_OPEN_UNIT_ID
  : TEST_APP_OPEN_UNIT_ID;

/**
 * Google'ın resmî "test cihazı" mekanizması. GERÇEK reklam birimiyle
 * çalışır, yalnızca listelenen cihazlara test reklamı sunar. Yayın
 * build'inde boş olmalıdır.
 */
export const adTestDeviceIds: string[] = (
  process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS || ""
)
  .split(",")
  .map((s: string) => s.trim())
  .filter(Boolean);

// ── GEÇİŞ REKLAMI (INTERSTITIAL) — KAPALI ───────────────────────────────
// AdMob panelinde bu uygulama için GEÇİŞ REKLAMI birimi oluşturulmadı ve
// test kimlikleri kod tabanından kaldırıldı. Dolayısıyla gösterilebilecek
// geçerli bir geçiş reklamı birimi YOKTUR → özellik tamamen kapalıdır.
//
// AdMob'da bir geçiş reklamı birimi oluşturursanız:
//   1) Kimliği aşağıdaki `interstitialUnitId` sabitine yazın,
//   2) `interstitialEnabled` değerini `true` yapın.
// Altyapının tamamı (yükleme, 10 dk bekleme, olay yönetimi) hazır bekliyor.
export const interstitialEnabled = false;
export const interstitialUnitId = isProductionAds ? "" : TEST_INTERSTITIAL_UNIT_ID;

/** İnterstitial cooldown — kullanıcıyı rahatsız etmemek için minimum 10 dk. */
export const INTERSTITIAL_COOLDOWN_MS = 10 * 60 * 1000;

// ── App Open zamanlama politikası ───────────────────────────────────────
// Google App Open formatı hem açılışta hem uygulamaya geri dönüşte kullanılabilir.
// Buradaki değerler Google'ın zorunlu sayıları değil; Zikirmatik için bilinçli,
// kullanıcı-dostu yerel güvenlik sınırlarıdır. AdMob panelinde ayrıca server-side
// frequency cap uygulanmalıdır.

/** Cold-start loading kapısının sert üst sınırı. */
export const APP_OPEN_COLD_START_MAX_WAIT_MS = 3 * 1000;

/** Tam ekran App Open gösterimleri arasında yerel minimum süre: 15 dakika. */
export const APP_OPEN_MIN_INTERVAL_MS = 15 * 60 * 1000;

/** Kısa uygulama geçişlerinde reklam gösterme; en az 60 sn uzakta kalınmalı. */
export const APP_OPEN_RESUME_MIN_BACKGROUND_MS = 60 * 1000;

/** Google App Open cache yaşam süresi üst sınırı: 4 saat. */
export const APP_OPEN_MAX_CACHE_MS = 4 * 60 * 60 * 1000;

// ── Banner yerleşimi ────────────────────────────────────────────────────
/**
 * Banner alanı için AYRILAN sabit yükseklik (dp).
 *
 * v1.1.0: "REKLAM" etiketi kaldırıldığı için 62 → 54 dp'ye indirildi.
 * 50 dp standart banner + 4 dp güvenlik payı.
 *
 * Bu alan HER ZAMAN ayrılır ve HER ZAMAN görünür kalır — reklam
 * yüklenmese bile (no-fill) daraltılmaz. Böylece:
 *   - Ekran düzeni reklam gelince/gelmeyince zıplamaz,
 *   - Reklam alanı layout'ta belirlenmiş, sabit ve görünür bir yerdedir,
 *   - İçerik reklamın altında kalmaz (ekranlar bu kadar alt boşluk bırakır).
 *
 */
export const BANNER_SLOT_HEIGHT = 54;

// Tanılama/log amaçlı özet (yalnızca geliştirmede yararlı).
export const adDebugInfo = {
  ADS_ENABLED,
  adsEnabled,
  isExpoGo,
  isProductionAds,
  platform: Platform.OS,
  bannerUnitId,
  appOpenUnitId,
  interstitialEnabled,
  testDeviceCount: adTestDeviceIds.length,
};

if (!isProductionAds) {
  console.warn(
    "[ads] TEST MODU: Google'in ornek reklam birimleri kullaniliyor. " +
      "Bu derleme Play'e YUKLENMEMELIDIR."
  );
}
