"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let failures = 0;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function ok(label, condition) {
  if (condition) console.log(`  ok   ${label}`);
  else {
    failures += 1;
    console.log(`  FAIL ${label}`);
  }
}

console.log("\n== v1.0.21 cold-start only App Open ==");

const app = JSON.parse(read("app.json"));
ok("versionName 1.0.21", app.expo.version === "1.0.21");
ok("source versionCode 1027 (> Play 1025 ve APK 1026)", app.expo.android.versionCode === 1027);

const rootLayout = read("app/_layout.tsx");
const tabsLayout = read("app/(tabs)/_layout.tsx");
ok(
  "App Open yalnız root splash/loading seviyesinde",
  rootLayout.includes('useAppOpenAd({ gateColdStart: true })') &&
    !tabsLayout.includes("useAppOpenAd")
);

const appOpen = read("src/ads/useAppOpenAd.ts");
ok(
  "background->foreground AppState listener tamamen kaldırıldı",
  !appOpen.includes('AppState.addEventListener("change"') &&
    !appOpen.includes('show("öne geldi"')
);
ok(
  "foreground için preload/reload yolu yok",
  !appOpen.includes("loadRef") &&
    !appOpen.includes("APP_OPEN_COOLDOWN_MS")
);
ok(
  "reklam kapanınca yeni App Open preload edilmiyor",
  !appOpen.includes("setTimeout(() => load") &&
    appOpen.includes("preload ETME")
);
ok(
  "cold-start kapısı kapandıktan sonra yeni reklam yüklenmiyor",
  appOpen.includes("if (coldStartSettledRef.current) return;")
);
ok(
  "geç gelen reklam aktif içerik üzerine bindirilmiyor",
  appOpen.includes('AppState.currentState !== "active"') &&
    appOpen.includes("cold-start fırsatı geçti")
);
ok(
  "cold-start timeout geç reklam isteğini temizliyor",
  appOpen.includes("APP_OPEN_COLD_START_MAX_WAIT_MS") &&
    appOpen.includes('settleColdStart("bekleme süresi doldu")')
);

const adConfig = read("src/ads/adConfig.ts");
ok(
  "App Open foreground cooldown sabiti kaldırıldı",
  !adConfig.includes("APP_OPEN_COOLDOWN_MS")
);
ok(
  "3 saniyelik splash üst sınırı korunuyor",
  adConfig.includes("APP_OPEN_COLD_START_MAX_WAIT_MS = 3 * 1000")
);

const banner = read("src/ads/BottomBanner.tsx");
ok(
  "banner reklam alanı oturum boyunca mounted kalacak altyapıda",
  banner.includes("<BannerAd") && banner.includes("BANNER_SLOT_HEIGHT")
);
ok(
  "tabs ekranlarında banner gösterimi korunuyor",
  tabsLayout.includes("<BottomBanner") && tabsLayout.includes("bannerVisible")
);
ok(
  "interstitial gerçek birim oluşturulana kadar kapalı",
  adConfig.includes("interstitialEnabled = false") &&
    adConfig.includes('interstitialUnitId = ""')
);

const provider = read("src/ads/AdsProvider.tsx");
ok(
  "UMP fail-closed hardening korunuyor",
  !/allowed\s*=\s*true/.test(provider) && provider.includes("info.canRequestAds")
);

const settings = read("app/(tabs)/ayarlar.tsx");
ok(
  "privacy/AdMob açıklaması korunuyor",
  settings.includes("Google AdMob") && settings.includes("Zikir Verileri")
);

console.log("\n----------------------------------");
if (failures > 0) {
  console.log(`${failures} TEST BAŞARISIZ`);
  process.exit(1);
}
console.log("v1.0.21 COLD-START ONLY APP OPEN TESTLERİ GEÇTİ");
