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

console.log("\n== v1.0.21 policy-aligned App Open lifecycle + banner ==");

const app = JSON.parse(read("app.json"));
ok("versionName 1.0.21", app.expo.version === "1.0.21");
ok("source versionCode 1027", app.expo.android.versionCode === 1027);

const rootLayout = read("app/_layout.tsx");
const tabsLayout = read("app/(tabs)/_layout.tsx");
const appOpen = read("src/ads/useAppOpenAd.ts");
const adConfig = read("src/ads/adConfig.ts");
const banner = read("src/ads/BottomBanner.tsx");

ok(
  "App Open yöneticisi yalnız root seviyesinde",
  rootLayout.includes("useAppOpenAd") && !tabsLayout.includes("useAppOpenAd")
);
ok(
  "cold-start loading gate korunuyor",
  rootLayout.includes("coldStartSettled") &&
    appOpen.includes("APP_OPEN_COLD_START_MAX_WAIT_MS")
);
ok(
  "resume reklamı için ayrı loading gate var",
  rootLayout.includes("resumeGateVisible") &&
    rootLayout.includes("app-open-resume-loading-gate")
);
ok(
  "background->foreground AppState yaşam döngüsü kontrollü",
  appOpen.includes('AppState.addEventListener("change"') &&
    appOpen.includes("APP_OPEN_RESUME_MIN_BACKGROUND_MS")
);
ok(
  "kısa uygulama geçişlerinde App Open yok",
  adConfig.includes("APP_OPEN_RESUME_MIN_BACKGROUND_MS = 60 * 1000")
);
ok(
  "tam ekran App Open yerel cooldown 15 dakika",
  adConfig.includes("APP_OPEN_MIN_INTERVAL_MS = 15 * 60 * 1000")
);
ok(
  "cooldown processler arasında AsyncStorage ile korunuyor",
  appOpen.includes("AsyncStorage") && appOpen.includes("LAST_SHOWN_KEY")
);
ok(
  "resume anında reklam hazır değilse sonradan bindirilmiyor",
  appOpen.includes("if (!isAdUsable())") &&
    appOpen.includes('loadRef.current("preload")')
);
ok(
  "resume reklamı önceden yükleniyor",
  appOpen.includes('load("preload")') &&
    appOpen.includes('loadPurposeRef.current !== "cold-start"')
);
ok(
  "App Open cache 4 saat ile sınırlı",
  adConfig.includes("APP_OPEN_MAX_CACHE_MS = 4 * 60 * 60 * 1000")
);
ok(
  "banner oturum boyunca mounted kalıyor",
  banner.includes("<BannerAd") && banner.includes("BANNER_SLOT_HEIGHT")
);
ok(
  "tabs ekranlarında tek banner korunuyor",
  tabsLayout.includes("<BottomBanner") && tabsLayout.includes("bannerVisible")
);
ok(
  "interstitial gerçek unit ID olmadığı için kapalı",
  adConfig.includes("interstitialEnabled = false") &&
    adConfig.includes('interstitialUnitId = ""')
);

const provider = read("src/ads/AdsProvider.tsx");
ok(
  "UMP fail-closed hardening korunuyor",
  !/allowed\s*=\s*true/.test(provider) && provider.includes("info.canRequestAds")
);

ok(
  "tam ekran App Open sırasında banner native view unmount ediliyor",
  banner.includes("fullScreenAdActive") &&
    provider.includes("setFullScreenAdActive")
);
ok(
  "reklam lifecycle AppState geçişleri yeni resume sayılmıyor",
  appOpen.includes("ignoreAppStateUntilRef") &&
    appOpen.includes("APP_OPEN_ACTIVITY_GUARD_MS")
);
ok(
  "reklama tıklayıp dönünce ikinci App Open bastırılıyor",
  appOpen.includes("AdEventType.CLICKED") &&
    appOpen.includes("suppressNextResumeRef")
);
ok(
  "kullanılmış App Open nesnesi atılıp taze reklam preload ediliyor",
  appOpen.includes("discardAd();") &&
    appOpen.includes('loadRef.current("preload")')
);

console.log("\n----------------------------------");
if (failures > 0) {
  console.log(`${failures} TEST BAŞARISIZ`);
  process.exit(1);
}
console.log("v1.0.21 POLICY-ALIGNED REKLAM TESTLERİ GEÇTİ");
