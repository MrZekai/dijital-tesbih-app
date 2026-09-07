#!/usr/bin/env node
/**
 * verify-aab.js — uretim AAB'sini Play'e yuklemeden ONCE dogrular.
 *
 * Kullanim:
 *   node scripts/verify-aab.js <aab-yolu> --cert <SHA256> --min-version-code 1028
 *
 * KONTROLLER (biri tutmazsa cikis kodu 1)
 *   1. IMZA VAR MI      — META-INF icinde .RSA/.DSA/.EC bulunmali.
 *                         Imzasiz AAB, imza yapilandirmasinin baglanmadigi
 *                         anlamina gelir ve Play tarafindan reddedilir.
 *   2. SERTIFIKA DOGRU MU — Play'deki 1028 ile AYNI yukleme anahtari.
 *                         Farkli sertifika = Play reddi. `keytool` ile
 *                         okunur; bu script yalnizca karsilastirir.
 *   3. 16 KB HIZASI     — 64-bit .so dosyalarinda tum PT_LOAD segment
 *                         hizalari >= 16384 olmali (Play zorunlulugu).
 *   4. PAKET / SURUM    — applicationId ve versionCode, base modulun
 *                         ikili AndroidManifest'inden okunur; bu, app.json
 *                         degil GERCEKTEN PAKETLENEN degerdir.
 *
 * Not: Ikili AndroidManifest (AXML) icin harici arac gerekmez; gerekli
 * alanlar dogrudan cozulur.
 */

const fs = require("fs");
const { execFileSync } = require("child_process");
const os = require("os");
const path = require("path");

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : def;
}

const aabPath = process.argv[2];
const wantCert = (arg("--cert", "") || "").replace(/[^0-9a-fA-F]/g, "").toUpperCase();
const minVc = parseInt(arg("--min-version-code", "1028"), 10);
const wantPkg = arg("--package", "com.zikirhane.tesbih");

let failures = 0;
const ok = (label, cond, detail) => {
  console.log(`  ${cond ? "ok  " : "FAIL"} ${label}${detail ? " — " + detail : ""}`);
  if (!cond) failures += 1;
};

if (!aabPath || !fs.existsSync(aabPath)) {
  console.error("AAB bulunamadi:", aabPath);
  process.exit(1);
}

// ── ZIP okuyucu (bagimliliksiz) ──────────────────────────────────────
function readZip(file) {
  const buf = fs.readFileSync(file);
  const eocdSig = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === eocdSig) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("ZIP dizini bulunamadi");
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const cmtLen = buf.readUInt16LE(off + 32);
    const lho = buf.readUInt32LE(off + 42);
    const name = buf.toString("utf8", off + 46, off + 46 + nameLen);
    entries.push({ name, method, compSize, lho });
    off += 46 + nameLen + extraLen + cmtLen;
  }
  const zlib = require("zlib");
  const read = (e) => {
    const nl = buf.readUInt16LE(e.lho + 26);
    const el = buf.readUInt16LE(e.lho + 28);
    const start = e.lho + 30 + nl + el;
    const raw = buf.subarray(start, start + e.compSize);
    return e.method === 0 ? raw : zlib.inflateRawSync(raw);
  };
  return { entries, read };
}

const zip = readZip(aabPath);

// ── 1) Imza var mi ───────────────────────────────────────────────────
const sigEntry = zip.entries.find((e) =>
  /^META-INF\/[^/]+\.(RSA|DSA|EC)$/i.test(e.name)
);
ok("AAB imzalanmis", Boolean(sigEntry), sigEntry ? sigEntry.name : "META-INF'te imza yok");

// ── 2) Sertifika parmak izi ──────────────────────────────────────────
if (sigEntry && wantCert) {
  const tmp = path.join(os.tmpdir(), "zikir-cert-" + process.pid);
  fs.writeFileSync(tmp, zip.read(sigEntry));
  let actual = "";
  try {
    const out = execFileSync("keytool", ["-printcert", "-file", tmp], {
      encoding: "utf8",
    });
    const m = /SHA256:\s*([0-9A-Fa-f:\s]+)/.exec(out);
    if (m) actual = m[1].replace(/[^0-9a-fA-F]/g, "").toUpperCase();
    const subj = /Owner:\s*([^\n]+)/.exec(out);
    if (subj) console.log("       sertifika sahibi:", subj[1].trim());
  } catch (e) {
    console.log("       keytool calistirilamadi:", e.message);
  } finally {
    fs.unlinkSync(tmp);
  }
  const same = actual === wantCert;
  ok(
    "imza sertifikasi Play'deki yukleme anahtariyla ayni",
    same,
    same ? actual.slice(0, 16) + "…" : `beklenen ${wantCert.slice(0, 16)}… bulunan ${actual.slice(0, 16) || "(okunamadi)"}…`
  );
}

// ── 3) 16 KB sayfa hizasi ────────────────────────────────────────────
const sos = zip.entries.filter((e) => e.name.endsWith(".so"));
const misaligned = [];
let checked64 = 0;
for (const e of sos) {
  const d = zip.read(e);
  if (d.length < 64 || d.readUInt32BE(0) !== 0x7f454c46) continue;
  if (d[4] !== 2) continue; // yalnizca 64-bit
  checked64 += 1;
  const phoff = Number(d.readBigUInt64LE(0x20));
  const phentsize = d.readUInt16LE(0x36);
  const phnum = d.readUInt16LE(0x38);
  let worst = null;
  for (let i = 0; i < phnum; i++) {
    const o = phoff + i * phentsize;
    if (o + 56 > d.length) break;
    if (d.readUInt32LE(o) !== 1) continue; // PT_LOAD
    const align = Number(d.readBigUInt64LE(o + 48));
    worst = worst === null ? align : Math.min(worst, align);
  }
  if (worst !== null && worst < 16384) misaligned.push(`${e.name} (${worst})`);
}
ok(
  `64-bit yerel kutuphaneler 16 KB hizali (${checked64} dosya)`,
  misaligned.length === 0,
  misaligned.join(", ")
);

// ── 4) Paket adi ve surum kodu (base modulun manifestinden) ──────────
// ONEMLI: AAB icindeki manifest, APK'daki gibi ikili XML (AXML) DEGILDIR;
// aapt2'nin protobuf bicimindedir. Bu yuzden AXML cozucusu ise yaramaz.
// Sema (aapt Resources.proto):
//   XmlNode      { XmlElement element = 1 }
//   XmlElement   { ns_decl=1, ns_uri=2, name=3, attribute=4, child=5 }
//   XmlAttribute { ns_uri=1, name=2, value=3, resource_id=4, compiled=5 }
function protoFields(buf) {
  const out = [];
  let i = 0;
  while (i < buf.length) {
    let key = 0, shift = 0, b;
    do {
      if (i >= buf.length) return out;
      b = buf[i++];
      key |= (b & 0x7f) << shift;
      shift += 7;
    } while (b & 0x80);
    const field = key >>> 3;
    const wire = key & 7;
    if (wire === 2) {
      let len = 0; shift = 0;
      do { b = buf[i++]; len |= (b & 0x7f) << shift; shift += 7; } while (b & 0x80);
      out.push({ field, wire, data: buf.subarray(i, i + len) });
      i += len;
    } else if (wire === 0) {
      let v = 0n; shift = 0n;
      do { b = buf[i++]; v |= BigInt(b & 0x7f) << shift; shift += 7n; } while (b & 0x80);
      out.push({ field, wire, value: Number(v) });
    } else if (wire === 5) { out.push({ field, wire, value: buf.readUInt32LE(i) }); i += 4; }
    else if (wire === 1) { out.push({ field, wire }); i += 8; }
    else return out;
  }
  return out;
}

/** Ic ice protobuf'ta ilk tam sayi degerini bulur (compiled_item icin). */
function firstInt(buf, depth = 0) {
  if (depth > 4) return undefined;
  for (const f of protoFields(buf)) {
    if (f.wire === 0 && f.value !== undefined) return f.value;
    if (f.wire === 2) {
      const v = firstInt(f.data, depth + 1);
      if (v !== undefined) return v;
    }
  }
  return undefined;
}

function manifestAttrs(buf) {
  const node = protoFields(buf);
  const el = node.find((f) => f.field === 1 && f.wire === 2);
  if (!el) throw new Error("XmlElement bulunamadi");
  const attrs = {};
  for (const f of protoFields(el.data)) {
    if (f.field !== 4 || f.wire !== 2) continue;
    let name, value, compiled;
    for (const a of protoFields(f.data)) {
      if (a.field === 2 && a.wire === 2) name = a.data.toString("utf8");
      if (a.field === 3 && a.wire === 2) value = a.data.toString("utf8");
      if (a.field === 5 && a.wire === 2) compiled = a.data;
    }
    if (!name) continue;
    if ((value === undefined || value === "") && compiled) {
      const n = firstInt(compiled);
      if (n !== undefined) value = String(n);
    }
    attrs[name] = value;
  }
  return attrs;
}

const manifestEntry = zip.entries.find((e) => e.name === "base/manifest/AndroidManifest.xml");
if (manifestEntry) {
  try {
    const attrs = manifestAttrs(zip.read(manifestEntry));
    const pkg = attrs["package"];
    const vc = attrs["versionCode"];
    const vn = attrs["versionName"];
    console.log("       paketlenen:", pkg, "versionCode=" + vc, "versionName=" + vn);
    ok("applicationId degismemis", pkg === wantPkg, String(pkg));
    ok(`versionCode > ${minVc}`, Number(vc) > minVc, String(vc));
  } catch (e) {
    ok("manifest okunabildi", false, e.message);
  }
} else {
  ok("base/manifest/AndroidManifest.xml var", false);
}

console.log("");
if (failures > 0) {
  console.error(`${failures} DOGRULAMA BASARISIZ — bu AAB Play'e YUKLENMEMELI.`);
  process.exit(1);
}
console.log("TUM DOGRULAMALAR GECTI.");
