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

console.log("\n== v1.0.20 Play Store hardening ==");

const app = JSON.parse(read("app.json"));
ok("versionName 1.0.20", app.expo.version === "1.0.20");
ok("versionCode 1024 (> Play Alpha 1023)", app.expo.android.versionCode === 1024);
ok(
  "mağaza uygulama adı korunuyor",
  app.expo.name === "Zikirmatik: Dijital Tesbih"
);
ok(
  "generic FOREGROUND_SERVICE blocked",
  app.expo.android.blockedPermissions.includes("android.permission.FOREGROUND_SERVICE")
);

const provider = read("src/ads/AdsProvider.tsx");
ok(
  "UMP unknown/error için allowed=true fallback yok",
  !/allowed\s*=\s*true/.test(provider)
);
ok(
  "getConsentInfo canRequestAds gerçek değerini kullanıyor",
  provider.includes("info.canRequestAds")
);
ok(
  "consentReady App Open ile consent formunu ayırıyor",
  provider.includes("consentReady")
);
ok(
  "privacy-options sonrası consent tekrar senkronize ediliyor",
  provider.includes("await syncConsentAndSdk(sdk)")
);
ok(
  "bilinmeyen kullanıcı yaşı için TFUA/TFCD false zorlanmıyor",
  !provider.includes("tagForUnderAgeOfConsent") &&
    !provider.includes("tagForChildDirectedTreatment")
);

const rootLayout = read("app/_layout.tsx");
const tabsLayout = read("app/(tabs)/_layout.tsx");
ok(
  "App Open root loading/splash seviyesinde",
  rootLayout.includes('useAppOpenAd({ gateColdStart: true })')
);
ok(
  "App Open tabs layout'tan kaldırıldı",
  !tabsLayout.includes("useAppOpenAd")
);
ok(
  "splash App Open cold-start fırsatı bitince kapanıyor",
  rootLayout.includes("coldStartSettled") && rootLayout.includes("SplashScreen.hideAsync")
);
ok(
  "root splash için 5 sn fail-safe var",
  rootLayout.includes("5000") && rootLayout.includes("failSafe")
);

const appOpen = read("src/ads/useAppOpenAd.ts");
ok(
  "geç yüklenen cold-start reklamı gate kapanınca gösterilmiyor",
  appOpen.includes("!coldStartSettledRef.current")
);
ok(
  "cold-start sert timeout var",
  appOpen.includes("APP_OPEN_COLD_START_MAX_WAIT_MS")
);

const adConfig = read("src/ads/adConfig.ts");
ok(
  "eski 8 saniyelik cold-start pencere sabiti kaldırıldı",
  !adConfig.includes("APP_OPEN_COLD_START_WINDOW_MS")
);
ok(
  "yeni loading gate üst sınırı 3 saniye",
  adConfig.includes("APP_OPEN_COLD_START_MAX_WAIT_MS = 3 * 1000")
);

const manifestPlugin = read("plugins/withZikirmatikManifestCleanup.js");
ok(
  "manifest plugin generic FGS iznini de tools:node=remove yapıyor",
  manifestPlugin.includes('TARGET_PERMISSIONS = ["android.permission.FOREGROUND_SERVICE"]') &&
    manifestPlugin.includes('"tools:node": "remove"')
);

const settings = read("app/(tabs)/ayarlar.tsx");
ok(
  "privacy metni cihaz-yerel zikir verisi ile AdMob'u ayırıyor",
  settings.includes("Google AdMob") && settings.includes("Zikir Verileri")
);

console.log("\n----------------------------------");
if (failures > 0) {
  console.log(`${failures} TEST BAŞARISIZ`);
  process.exit(1);
}
console.log("v1.0.20 PLAY STORE HARDENING TESTLERİ GEÇTİ");
