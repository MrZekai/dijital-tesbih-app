#!/usr/bin/env node
/**
 * attach-release-signing.js
 *
 * NE YAPAR
 * ────────
 * `expo prebuild` ile uretilen `android/app/build.gradle` dosyasinda
 * release derlemesi VARSAYILAN OLARAK DEBUG anahtariyla imzalanir:
 *
 *     buildTypes { release { signingConfig signingConfigs.debug ... } }
 *
 * Bu, Play'e yuklenebilir bir AAB uretmez. Bu script:
 *   1. `signingConfigs` blogunun icine `zikirUpload` adinda yeni bir
 *      yapilandirma ekler (degerleri gradle.properties'ten okur),
 *   2. `release` buildType'inin imzasini ona baglar.
 *
 * NEDEN AYRI DOSYA
 * ────────────────
 * Onceden bu yama is akisi YAML'inin icine gomuluydu; YAML blok girinti
 * kurallari yuzunden kirilgandi. Ayri dosya olunca yerelde test
 * edilebiliyor ve `node scripts/attach-release-signing.js --check` ile
 * dogrulanabiliyor.
 *
 * ANAHTAR BU DOSYADA YOK. Yalnizca gradle.properties'teki degisken
 * ADLARINA referans verir; parolalar CI secret'larindan gelir.
 */

const fs = require("fs");
const path = require("path");

const GRADLE = path.join(__dirname, "..", "android", "app", "build.gradle");

const SIGNING_BLOCK = `        zikirUpload {
            storeFile file(project.property("ZIKIR_UPLOAD_STORE_FILE"))
            storePassword project.property("ZIKIR_UPLOAD_STORE_PASSWORD")
            keyAlias project.property("ZIKIR_UPLOAD_KEY_ALIAS")
            keyPassword project.property("ZIKIR_UPLOAD_KEY_PASSWORD")
        }
`;

function patch(src) {
  if (src.includes("zikirUpload")) {
    return { text: src, changed: false, note: "zaten bagli" };
  }

  const m = /signingConfigs\s*\{/.exec(src);
  if (!m) throw new Error("signingConfigs blogu bulunamadi");
  let out = src.slice(0, m.index + m[0].length) + "\n" + SIGNING_BLOCK + src.slice(m.index + m[0].length);

  // release buildType'inin govdesini bul ve imzayi degistir.
  const rel = /buildTypes\s*\{[\s\S]*?release\s*\{/.exec(out);
  if (!rel) throw new Error("release buildType bulunamadi");
  const start = rel.index + rel[0].length;

  // Dengeli parantez ile release blogunun sonunu bul.
  let depth = 1;
  let i = start;
  while (i < out.length && depth > 0) {
    if (out[i] === "{") depth += 1;
    else if (out[i] === "}") depth -= 1;
    i += 1;
  }
  const body = out.slice(start, i - 1);
  if (!/signingConfig\s+signingConfigs\.\w+/.test(body)) {
    throw new Error("release icinde signingConfig satiri yok");
  }
  const newBody = body.replace(
    /signingConfig\s+signingConfigs\.\w+/,
    "signingConfig signingConfigs.zikirUpload"
  );
  out = out.slice(0, start) + newBody + out.slice(i - 1);
  return { text: out, changed: true, note: "release -> zikirUpload" };
}

module.exports = { patch };

if (require.main === module) {
  if (process.argv.includes("--self-test")) {
    const sample = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            shrinkResources false
            minifyEnabled false
        }
    }
}`;
    const r = patch(sample);
    const relBody = /release\s*\{([\s\S]*?)\n\s*\}/.exec(r.text)[1];
    const debugBody = /debug\s*\{\s*\n\s*signingConfig[^\n]*/.exec(r.text)[0];
    const okRelease = /signingConfig signingConfigs\.zikirUpload/.test(relBody);
    const okDebugKept = /signingConfigs\.debug/.test(debugBody);
    const okBlock = r.text.includes("zikirUpload {") && r.text.includes("ZIKIR_UPLOAD_STORE_FILE");
    const okIdempotent = patch(r.text).changed === false;
    const pass = okRelease && okDebugKept && okBlock && okIdempotent;
    console.log("  release imzasi zikirUpload'a baglandi :", okRelease);
    console.log("  debug buildType bozulmadi             :", okDebugKept);
    console.log("  signingConfigs blogu eklendi          :", okBlock);
    console.log("  ikinci calistirma degisiklik yapmiyor :", okIdempotent);
    if (!pass) {
      console.error("SELF-TEST BASARISIZ");
      process.exit(1);
    }
    console.log("attach-release-signing self-test GECTI");
    process.exit(0);
  }

  const src = fs.readFileSync(GRADLE, "utf8");
  const r = patch(src);
  if (r.changed) fs.writeFileSync(GRADLE, r.text, "utf8");
  console.log(`[attach-release-signing] ${r.note}`);
}
