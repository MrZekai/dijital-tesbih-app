"use strict";
// v1.1.0 — URETIM AAB guvenlik testleri.
//
// Amac: Play'deki 1.0.21 / 1028 surumunun DEVAMI olarak yuklenebilecek,
// dogru anahtarla imzalanmis bir AAB uretilmesini garanti altina almak ve
// asagidaki hatalarin sessizce gecmesini engellemek:
//
//   - yeni bir keystore uretilmesi veya repoya anahtar girmesi
//   - farkli bir sertifikayla imzalanmis AAB'nin "hazir" sayilmasi
//   - applicationId'nin degismesi (yeni uygulama olusmasi)
//   - versionCode'un 1028'e esit veya kucuk kalmasi
//   - is akisinin Play'e otomatik yukleme yapmasi

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "..");
let failures = 0;
const read = (p) => fs.readFileSync(p, "utf8");
function ok(label, cond) {
  if (cond) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}`); }
}

console.log("\n== v1.1.0 uretim AAB guvenligi ==");

const WF = path.join(REPO, ".github/workflows/android-production-aab.yml");
ok("uretim AAB is akisi var", fs.existsSync(WF));
const wf = fs.existsSync(WF) ? read(WF) : "";

// ── 1) Play'e otomatik yukleme YOK ───────────────────────────────────
ok("Play'e otomatik yukleme yapilmiyor",
  !/upload-google-play|r0adkll|supply|play-publish|serviceAccountJson/i.test(wf));
ok("yalnizca elle tetiklenir (push tetikleyicisi yok)",
  wf.includes("workflow_dispatch") && !/^\s*push:/m.test(wf));

// ── 2) Anahtar repoda degil ──────────────────────────────────────────
ok("keystore secret'tan geliyor", wf.includes("ANDROID_KEYSTORE_BASE64"));
ok("keystore calisma dizini disinda aciliyor", wf.includes("RUNNER_TEMP/signing"));
ok("is bitince keystore siliniyor",
  /if:\s*always\(\)/.test(wf) && wf.includes('rm -rf "$RUNNER_TEMP/signing"'));
ok("yeni keystore URETILMIYOR", !/keytool\s+-genkey|-genkeypair/.test(wf));

const gitignore = read(path.join(REPO, ".gitignore"));
for (const pat of ["*.keystore", "*.jks", "*.aab", "*.apk"]) {
  ok(`.gitignore disliyor: ${pat}`, gitignore.includes(pat));
}
const stray = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (["node_modules", ".git", ".expo", "android", "ios"].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(keystore|jks|p12|pepk)$/i.test(e.name)) stray.push(p);
  }
})(REPO);
ok(`repoda anahtar dosyasi yok (${stray.length})`, stray.length === 0);

// ── 3) Uretim reklam modu ────────────────────────────────────────────
ok("EXPO_PUBLIC_ADS_MODE=production", /EXPO_PUBLIC_ADS_MODE:\s*production/.test(wf));

// ── 4) Dogrulama adimi gercekten calisiyor ───────────────────────────
ok("verify-aab.js cagriliyor", wf.includes("scripts/verify-aab.js"));
// Yukleme anahtari Play Console uzerinden SIFIRLANDI (eski anahtar
// Emergent'teydi ve erisilemiyordu). Play App Signing acik oldugu icin
// uygulama imzalama anahtari Google'da kaldi; mevcut kullanicilar
// etkilenmez. Bu test yeni anahtarin beklendigini kilitler.
ok("beklenen sertifika YENI yukleme anahtari",
  wf.includes("14:FA:0B:17:E5:F6:E4:AE:E6:98:27:3B:C1:32:30:A4:2E:4C:85:7F:A0:C4:36:AE:34:6F:74:A5:1E:28:D9:97"));
ok("eski (erisilemeyen) anahtar artik beklenmiyor",
  !wf.includes("94:B7:FE:7C:45:1A:9E:17:D3:12:C8:08:F3:F2:BD:BA:9A:3F:17:03:36:72:17:C9:26:5F:64:6F:48:2D:95:43"));
ok("min_version_code varsayilani 1028", /default:\s*"1028"/.test(wf));

const verifier = path.join(ROOT, "scripts/verify-aab.js");
ok("verify-aab.js mevcut", fs.existsSync(verifier));
const v = fs.existsSync(verifier) ? read(verifier) : "";
ok("imza varligini kontrol ediyor", v.includes("RSA|DSA|EC"));
ok("sertifika parmak izini karsilastiriyor", v.includes("keytool") && v.includes("SHA256"));
ok("16 KB sayfa hizasini kontrol ediyor",
  v.includes("16384") && v.includes("readBigUInt64LE") && v.includes("0x7f454c46"));
ok("protobuf manifestten paket/surum okuyor",
  v.includes("base/manifest/AndroidManifest.xml") && v.includes("protoFields"));
ok("hata durumunda cikis kodu 1", v.includes("process.exit(1)"));

// ── 5) Imza baglama scripti ──────────────────────────────────────────
const signer = path.join(ROOT, "scripts/attach-release-signing.js");
ok("attach-release-signing.js mevcut", fs.existsSync(signer));
const sg = fs.existsSync(signer) ? read(signer) : "";
ok("release imzasini debug'dan ayiriyor",
  sg.includes("signingConfigs.zikirUpload") && sg.includes("ZIKIR_UPLOAD_STORE_FILE"));
ok("scriptte parola yok",
  !/password\s*=\s*["'][^"']+["']/i.test(sg.replace(/project\.property\([^)]*\)/g, "")));
ok("kalite kapisinda self-test calisiyor",
  wf.includes("attach-release-signing.js --self-test"));

// ── 6) EAS yolu: MEVCUT projeye bagli, yeni proje acmiyor ────────────
const eas = JSON.parse(read(path.join(ROOT, "eas.json")));
ok("production profili app-bundle uretiyor",
  eas.build.production.android.buildType === "app-bundle");
ok("production profilinde gercek reklamlar",
  eas.build.production.env.EXPO_PUBLIC_ADS_MODE === "production");
ok("test profillerinde gercek reklam YOK",
  eas.build.preview.env.EXPO_PUBLIC_ADS_MODE === "test" &&
  eas.build.development.env.EXPO_PUBLIC_ADS_MODE === "test");
ok("versionCode'u EAS otomatik artirmiyor (app.json tek kaynak)",
  eas.build.production.autoIncrement === false);
ok("EAS otomatik Play yuklemesi yapilandirilmamis",
  Object.keys(eas.submit.production || {}).length === 0);

// ── 7) Kimlik: 1028'in devami ────────────────────────────────────────
const app = JSON.parse(read(path.join(ROOT, "app.json")));
ok("applicationId com.zikirhane.tesbih", app.expo.android.package === "com.zikirhane.tesbih");
ok("versionCode > 1028", app.expo.android.versionCode > 1028);
ok("versionName tanimli", Boolean(app.expo.version));
ok("MEVCUT EAS projesine bagli (yeni proje degil)",
  app.expo.extra.eas.projectId === "0cd40066-e675-4011-979a-6cc8b635e6fc");

console.log("\n----------------------------------");
if (failures > 0) { console.log(`${failures} TEST BAŞARISIZ`); process.exit(1); }
console.log("TÜM TESTLER GEÇTİ");
