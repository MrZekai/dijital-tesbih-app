"use strict";
// v1.1.0 — i18n anahtar esitligi, migration ve surum dogrulamalari.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let failures = 0;
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
function ok(label, cond) {
  if (cond) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}`); }
}

console.log("\n== v1.1.0 global i18n + migration ==");

// ── 1) Surum kimlikleri ────────────────────────────────────────────────
const app = JSON.parse(read("app.json"));
ok("package com.zikirhane.tesbih (DEGISMEDI)", app.expo.android.package === "com.zikirhane.tesbih");
ok("versionCode Play'deki 1028'den buyuk", app.expo.android.versionCode > 1028);
ok("versionName 1.1.0", app.expo.version === "1.1.0");
ok("AdMob app id korunuyor", JSON.stringify(app.expo.plugins).includes("ca-app-pub-1380972808968213~2930057843"));

// ── 2) Dil kayitlari ───────────────────────────────────────────────────
const LANG_DIR = path.join(ROOT, "src/i18n/locales");
const files = fs.readdirSync(LANG_DIR).filter((f) => f.endsWith(".ts") && f !== "index.ts");
const codes = files.map((f) => f.replace(/\.ts$/, ""));
ok("27 dil dosyasi mevcut", codes.length === 27);

const languagesTs = read("src/i18n/languages.ts");
for (const c of codes) {
  ok(`languages.ts icinde tanimli: ${c}`, languagesTs.includes(`code: "${c}"`));
}

// ── 3) Anahtar esitligi ────────────────────────────────────────────────
const KEY_RE = /^\s{2}"([^"]+)":/gm;
function keysOf(rel) {
  const src = read(rel);
  const out = new Set();
  let m;
  KEY_RE.lastIndex = 0;
  while ((m = KEY_RE.exec(src))) out.add(m[1]);
  return out;
}
const PLURALS = ["zero", "one", "two", "few", "many", "other"];
const stripPlural = (k) => {
  for (const p of PLURALS) if (k.endsWith("_" + p)) return k.slice(0, -(p.length + 1));
  return null;
};
const enKeys = keysOf("src/i18n/locales/en.ts");
const simple = new Set();
const pluralBases = new Set();
for (const k of enKeys) {
  const b = stripPlural(k);
  if (b) pluralBases.add(b); else simple.add(k);
}
ok("Ingilizce anahtar sayisi > 150", enKeys.size > 150);
ok("cogul tabanlari bulundu", pluralBases.size >= 3);

for (const c of codes) {
  if (c === "en") continue;
  const ks = keysOf(`src/i18n/locales/${c}.ts`);
  const missing = [...simple].filter((k) => !ks.has(k));
  ok(`${c}: eksik anahtar yok (${missing.slice(0, 3).join(", ")})`, missing.length === 0);
  const missingPlural = [...pluralBases].filter((b) => !ks.has(`${b}_other`));
  ok(`${c}: her cogul tabaninin _other bicimi var`, missingPlural.length === 0);
  const unknown = [...ks].filter((k) => !enKeys.has(k) && !(stripPlural(k) && pluralBases.has(stripPlural(k))));
  ok(`${c}: en.ts'de olmayan anahtar yok`, unknown.length === 0);
}

// ── 4) Sabit metin sizintisi ───────────────────────────────────────────
const SCREENS = [
  "app/(tabs)/index.tsx", "app/(tabs)/ayarlar.tsx", "app/(tabs)/istatistikler.tsx",
  "app/(tabs)/zikirlerim.tsx", "app/(tabs)/_layout.tsx", "app/custom-dhikr.tsx",
  "app/esma.tsx", "app/tesbihat.tsx", "app/onboarding.tsx", "app/_layout.tsx",
];
const TURKISH_WORDS = /(Sıfırla|Ayarlar|Zikirlerim|İstatistikler|Kaydet|Vazgeç|Uygula|Hedef Seç|Zikir Seç|Yeniden Dene)/;
for (const f of SCREENS) {
  const body = read(f)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const hits = body.match(new RegExp(`"[^"\\n]*${TURKISH_WORDS.source}[^"\\n]*"`, "g")) || [];
  ok(`${f}: kullanici metni sabit kodlu degil`, hits.length === 0);
}

// ── 5) RTL altyapisi ───────────────────────────────────────────────────
const rtl = read("src/lib/rtl.ts");
ok("RTL yardimcisi yon-duyarli satir/ikon/hiza veriyor",
  rtl.includes("row-reverse") && rtl.includes("backIcon") && rtl.includes("writingDirection"));
ok("RTL diller isaretli", languagesTs.includes('code: "ar"') && languagesTs.includes("rtl: true"));

// ── 6) Migration / veri korumasi ───────────────────────────────────────
const mig = read("src/lib/migration.ts");
ok("kalici anahtar zikirhane:v1 korunuyor", mig.includes('STORAGE_KEY = "zikirhane:v1"'));
ok("diske yazilan version alani 1 kaliyor (geri uyumluluk)", mig.includes("LEGACY_VERSION = 1"));
ok("ayri schemaRevision izleyicisi var", mig.includes("SCHEMA_REVISION"));
ok("dhikrHistoryTotals seed mantigi korunuyor", mig.includes("Math.max(live, hist)"));
ok("bilinmeyen alanlar korunuyor", mig.includes("...(src as object)"));

// ── 7) Reklam kimlikleri ───────────────────────────────────────────────
const adConfig = read("src/ads/adConfig.ts");
ok("uretim banner ID korunuyor", adConfig.includes("ca-app-pub-1380972808968213/1326176029"));
ok("uretim app-open ID korunuyor", adConfig.includes("ca-app-pub-1380972808968213/1789210450"));
ok("gelistirmede Google test birimleri", adConfig.includes("ca-app-pub-3940256099942544"));
ok("test/prod ayrimi __DEV__ ile", adConfig.includes("!__DEV__"));
ok("App Open lifecycle korumalari duruyor",
  adConfig.includes("APP_OPEN_RESUME_MIN_BACKGROUND_MS") &&
  adConfig.includes("APP_OPEN_MIN_INTERVAL_MS"));

console.log("\n----------------------------------");
if (failures > 0) { console.log(`${failures} TEST BAŞARISIZ`); process.exit(1); }
console.log("TÜM TESTLER GEÇTİ");
