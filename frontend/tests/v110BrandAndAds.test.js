"use strict";
// v1.1.0 — marka (logo) ve reklam etiketi regresyon testleri.
// Kullanicinin acik sikayetleri:
//   1) Launcher/splash'te Emergent E logosu goruluyordu.
//   2) Banner'in ustunde "Reklam / Advertisement" yazisi vardi.
// Bu testler ikisinin de geri gelmesini engeller.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
let failures = 0;
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const bytes = (rel) => fs.readFileSync(path.join(ROOT, rel));
function ok(label, cond) {
  if (cond) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}`); }
}

console.log("\n== v1.1.0 marka + reklam etiketi ==");

// ── 1) Emergent / sablon gorselleri tamamen kaldirildi ─────────────────
const IMG = path.join(ROOT, "assets/images");
const files = fs.readdirSync(IMG);
const forbidden = [
  "app-image.png", "react-logo.png", "react-logo@2x.png",
  "react-logo@3x.png", "partial-react-logo.png",
];
for (const f of forbidden) {
  ok(`sablon gorseli silinmis: ${f}`, !files.includes(f));
}

const required = [
  "icon.png", "adaptive-icon.png", "splash-icon.png",
  "favicon.png", "notification-icon.png",
];
for (const f of required) {
  ok(`marka gorseli mevcut: ${f}`, files.includes(f));
}

// ── 2) Ikon gercekten 1028'deki Zikirhane logosu mu? ──────────────────
// Emergent E logosu duz mavi bir zemine sahiptir; Zikirhane logosu koyu
// yesil zemin + altin motiftir. PNG'nin ham piksel ortalamasini okumak
// icin ek bagimlilik istemeyecek basit bir kontrol: dosya boyutu ve
// baskin renk yerine, uretim sirasinda kaydedilen imza dosyasini
// dogrulariz.
const brandLock = JSON.parse(read("assets/images/brand.lock.json"));
for (const [name, sha] of Object.entries(brandLock.sha256)) {
  const actual = crypto.createHash("sha256").update(bytes(`assets/images/${name}`)).digest("hex");
  ok(`${name} 1028 kaynagiyla ayni (sha256)`, actual === sha);
}
ok("marka kaynagi 1028.aab olarak kayitli",
  brandLock.source && brandLock.source.includes("1028.aab"));

// ── 3) app.json dogru marka dosyalarini gosteriyor ────────────────────
const app = JSON.parse(read("app.json"));
ok("launcher icon marka dosyasi", app.expo.icon === "./assets/images/icon.png");
ok("adaptive foreground marka dosyasi",
  app.expo.android.adaptiveIcon.foregroundImage === "./assets/images/adaptive-icon.png");
ok("adaptive arka plan marka yesili",
  /^#0[01][0-9A-F]{4}$/i.test(app.expo.android.adaptiveIcon.backgroundColor));
const splash = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === "expo-splash-screen");
ok("splash marka dosyasini kullaniyor",
  splash && splash[1].image === "./assets/images/splash-icon.png");
const notif = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === "expo-notifications");
ok("bildirim ikonu tanimli",
  notif && notif[1].icon === "./assets/images/notification-icon.png");
ok("favicon marka dosyasi", app.expo.web.favicon === "./assets/images/favicon.png");

// ── 4) Kaynak kodda Emergent markasi yok ──────────────────────────────
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".expo" || e.name === ".git") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx|json|md)$/.test(e.name)) out.push(p);
  }
  return out;
}
const srcFiles = walk(ROOT);
const brandHits = [];
for (const f of srcFiles) {
  const body = fs.readFileSync(f, "utf8");
  if (f.includes(path.sep + "tests" + path.sep)) continue; // testin kendisi
  if (body.includes("Start" + " building apps")) brandHits.push(f);
}
ok(`'Start building apps' metni yok (${brandHits.length})`, brandHits.length === 0);

// ── 5) Banner'da gorunur "Reklam" etiketi YOK ─────────────────────────
const banner = read("src/ads/BottomBanner.tsx");
ok("BottomBanner ads.label kullanmiyor", !banner.includes("ads.label"));
ok("BottomBanner ads.failed kullanmiyor", !banner.includes("ads.failed"));
const bannerCode = banner.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
ok("BottomBanner kodunda gorunur reklam etiketi yok",
  !/REKLAM|Advertisement/i.test(bannerCode));
ok("hata mesaji kullaniciya degil loga yaziliyor",
  banner.includes("__DEV__") && banner.includes("console.warn"));
ok("bos alan seffaf (cerceve/dolgu yok)",
  banner.includes('backgroundColor: "transparent"') &&
  !banner.includes("borderTopWidth"));

// Hicbir dilde ads.label / ads.failed kalmamali.
const LOC = path.join(ROOT, "src/i18n/locales");
const leaks = fs.readdirSync(LOC)
  .filter((f) => f.endsWith(".ts") && f !== "index.ts")
  .filter((f) => /"ads\.(label|failed)"/.test(fs.readFileSync(path.join(LOC, f), "utf8")));
ok(`hicbir dilde ads.label/ads.failed yok (${leaks.join(",")})`, leaks.length === 0);

// ── 6) Reklam kimlikleri hala dogru ───────────────────────────────────
const adConfig = read("src/ads/adConfig.ts");
ok("uretim banner ID korunuyor", adConfig.includes("ca-app-pub-1380972808968213/1326176029"));
ok("uretim app-open ID korunuyor", adConfig.includes("ca-app-pub-1380972808968213/1789210450"));
ok("AdMob app ID korunuyor",
  JSON.stringify(app.expo.plugins).includes("ca-app-pub-1380972808968213~2930057843"));

// ── 7) Ana sayfa gercekten yenilendi ──────────────────────────────────
const home = read("app/(tabs)/index.tsx");
ok("ana sayfada marka isareti var", home.includes("BRAND_MARK"));
ok("ana sayfada gunluk hedef seridi var", home.includes("home-goal-strip"));
ok("ana sayfada seri rozeti var", home.includes("home-streak"));
ok("ana sayfada hizli zikir gecisi var", home.includes("home-quick-switch"));
ok("sayac hala ana odak (MultiTouchTapArea)", home.includes("MultiTouchTapArea"));

// ── 8) Uygulama adi 27 dilde yerellestirildi ──────────────────────────
const nameplugin = require(path.join(ROOT, "plugins/withLocalizedAppName.js"));
const langCodes = fs.readdirSync(path.join(ROOT, "src/i18n/locales"))
  .filter((f) => f.endsWith(".ts") && f !== "index.ts" && f !== "en.ts")
  .map((f) => f.replace(/\.ts$/, ""));
const missingName = langCodes.filter((c) => !nameplugin.APP_NAMES[c]);
ok(`her dil icin launcher adi var (${missingName.join(",")})`, missingName.length === 0);
const missingQual = langCodes.filter((c) => !nameplugin.QUALIFIERS[c]);
ok(`her dil icin Android niteleyici var (${missingQual.join(",")})`, missingQual.length === 0);
const tooLong = Object.entries(nameplugin.APP_NAMES).filter(([, v]) => v.length > 20);
ok(`launcher adlari kisa (<=20) (${tooLong.map((x) => x[0]).join(",")})`, tooLong.length === 0);
ok("Turkce ad korunuyor", nameplugin.APP_NAMES.tr === "Zikirmatik");
ok("varsayilan ad kisa", nameplugin.APP_NAMES.default === "Dhikr Counter");
ok("app.json eklentiyi kullaniyor",
  JSON.stringify(app.expo.plugins).includes("withLocalizedAppName"));

// ── 9) Ses ayari ikiye bolundu ────────────────────────────────────────
const mig = read("src/lib/migration.ts");
ok("soundTap ve soundComplete alanlari var",
  mig.includes("soundTap: boolean") && mig.includes("soundComplete: boolean"));
ok("tamamlanma sesi varsayilan ACIK", /soundComplete:\s*true/.test(mig));
ok("tane sesi varsayilan KAPALI", /soundTap:\s*false/.test(mig));
ok("eski `sound` alani soundTap ile senkron",
  mig.includes("settings.sound = settings.soundTap"));
const homeSrc = read("app/(tabs)/index.tsx");
ok("ana sayfa iki ayri ses tercihini kullaniyor",
  homeSrc.includes("tap: s.soundTap") && homeSrc.includes("complete: s.soundComplete"));

// ── 10) Sistem dili secenegi ──────────────────────────────────────────
const i18n = read("src/i18n/index.tsx");
ok("SYSTEM_LANGUAGE tercihi var", i18n.includes('SYSTEM_LANGUAGE = "system"'));
ok("Yeni Mimari icin I18nManager.getConstants kullaniliyor",
  i18n.includes("getConstants?.().localeIdentifier"));
ok("cihaz dili degisince otomatik guncelleniyor",
  i18n.includes("preference !== SYSTEM_LANGUAGE") && i18n.includes("AppState.addEventListener"));
const settingsSrc = read("app/(tabs)/ayarlar.tsx");
ok("Ayarlar'da sistem dili satiri var", settingsSrc.includes('testID="lang-system"'));

// ── 11) Dini motifli SVG halka ────────────────────────────────────────
const ring = read("src/components/TesbihRingSvg.tsx");
ok("SVG halka Rub'el Hizb motifi ciziyor",
  ring.includes("squarePath") && ring.includes("starPolygon")
    && ring.includes("Rub'el Hizb"));
ok("taneler tek tek doluyor", ring.includes("i < filled"));
ok("ana sayfa yeni halkayi kullaniyor", homeSrc.includes("TesbihRingSvg"));
ok("halka ust siniri buyutuldu", /bigText \? 400 : 460/.test(homeSrc));
ok("ilk kullanim karti var", homeSrc.includes("home-first-use-card"));
ok("tamamlama kutlamasi var", homeSrc.includes("haloAnim"));

// ── 12) Sayac halkanin ortasinda kalmali ──────────────────────────────
// Regresyon: sayac sarmalayicisi mutlak konumlandirilmazsa SVG'den sonra
// akar, halkanin disina tasar ve alttaki hedef/tur satirinin uzerine biner.
ok("merkez yigini mutlak konumlu",
  /centerStack:\s*\{[^}]*position:\s*"absolute"/s.test(homeSrc));
ok("sayi + hedef + tur halkanin icinde tek yigin",
  homeSrc.includes("styles.centerStack"));
ok("Geri Al / Sifirla ayri satirda degil",
  !homeSrc.includes("ControlPill") && homeSrc.includes('testID="undo-button"'));

console.log("\n----------------------------------");
if (failures > 0) { console.log(`${failures} TEST BAŞARISIZ`); process.exit(1); }
console.log("TÜM TESTLER GEÇTİ");
