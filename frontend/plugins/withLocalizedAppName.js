/**
 * withLocalizedAppName — Android launcher adını dile göre yerelleştirir.
 *
 * SORUN
 * ─────
 * `app.json` içindeki `expo.name` TEK bir metindir ve Expo bunu doğrudan
 * `res/values/strings.xml` içine `app_name` olarak yazar. Sonuç: telefonu
 * Türkçe olan kullanıcı ana ekranda İngilizce "Dhikr Counter" görür.
 * Arayüz 27 dile çevrilmişken uygulamanın ADI çevrilmemiş oluyordu.
 *
 * ÇÖZÜM
 * ─────
 * Android'in standart kaynak niteleyicileriyle her dil için ayrı
 * `res/values-<dil>/strings.xml` üretiriz. Sistem, cihaz diline en uygun
 * olanı kendisi seçer; eşleşme yoksa `values/strings.xml` (İngilizce)
 * kullanılır. Ek çalışma zamanı kodu, ek izin ve ek bağımlılık YOK.
 *
 * NOTLAR
 *  - Launcher etiketi KISA olmalıdır; ana ekranda ~12-14 karakterden
 *    sonrası "…" ile kesilir. Bu yüzden mağaza adı ("Dhikr Counter:
 *    Digital Tasbih") ile launcher adı ("Dhikr Counter") ayrıdır.
 *    Mağaza adı Play Console'da dil dil ayrıca yerelleştirilir.
 *  - Endonezce için Android'in eski `in` kodu da yazılır; bazı cihazlar
 *    hâlâ onu bildirir.
 *  - Sorani, Dari ve Şahmuki Pencapça BCP-47 niteleyicisi ister
 *    (`values-b+ckb` gibi) — API 21+ destekler, minSdk 24 olduğu için
 *    sorun yoktur.
 */

const fs = require("fs");
const path = require("path");
const { withDangerousMod, withStringsXml, AndroidConfig } = require("expo/config-plugins");

/** Launcher etiketleri — KISA tutulur. */
const APP_NAMES = {
  default: "Dhikr Counter",
  tr: "Zikirmatik",
  ar: "عدّاد الذكر",
  id: "Penghitung Zikir",
  ms: "Pembilang Zikir",
  ur: "ذکر شمار",
  fa: "شمارنده ذکر",
  bn: "জিকির কাউন্টার",
  fr: "Compteur Dhikr",
  ru: "Счётчик зикра",
  az: "Zikr Sayğacı",
  uz: "Zikr Hisoblagich",
  kk: "Зікір санауыш",
  ky: "Зикир эсептегич",
  tg: "Ҳисобкунаки зикр",
  tk: "Zikir Hasaplaýjy",
  ps: "د ذکر شمېرونکی",
  sq: "Numërues Dhikri",
  bs: "Brojač zikra",
  so: "Tiriyaha Dhikrka",
  ha: "Ma'aunin Zikiri",
  sw: "Kihesabu Dhikri",
  ku: "Jimêra Zikrê",
  ckb: "ژمێرەری زیکر",
  dv: "ޛިކުރު ކައުންޓަރު",
  "fa-AF": "شمارندهٔ ذکر",
  "pa-Arab": "ذکر گِنتی",
};

/** Uygulama dil kodu → Android kaynak dizini niteleyici(leri). */
const QUALIFIERS = {
  tr: ["tr"],
  ar: ["ar"],
  id: ["in", "id"], // Android'in eski ISO kodu `in`
  ms: ["ms"],
  ur: ["ur"],
  fa: ["fa"],
  bn: ["bn"],
  fr: ["fr"],
  ru: ["ru"],
  az: ["az"],
  uz: ["uz"],
  kk: ["kk"],
  ky: ["ky"],
  tg: ["tg"],
  tk: ["tk"],
  ps: ["ps"],
  sq: ["sq"],
  bs: ["bs"],
  so: ["so"],
  ha: ["ha"],
  sw: ["sw"],
  ku: ["ku"],
  ckb: ["b+ckb"],
  dv: ["dv"],
  "fa-AF": ["b+fa+AF"],
  "pa-Arab": ["b+pa+Arab"],
};

/** Android string kaynağı kaçışları. */
function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "\\'");
}

function stringsFile(name) {
  return (
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    "<!-- Bu dosya plugins/withLocalizedAppName.js tarafindan URETILIR. -->\n" +
    "<!-- Elle duzenleme; prebuild sirasinda uzerine yazilir. -->\n" +
    "<resources>\n" +
    `  <string name="app_name">${escapeXml(name)}</string>\n` +
    "</resources>\n"
  );
}

const withLocalizedAppName = (config) => {
  // 1) Varsayılan (İngilizce) etiketi kısalt.
  config = withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [
        {
          _: APP_NAMES.default,
          $: { name: "app_name", translatable: "false" },
        },
      ],
      cfg.modResults
    );
    return cfg;
  });

  // 2) Dil başına strings.xml yaz.
  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const resDir = path.join(
        cfg.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res"
      );
      let written = 0;
      for (const [code, quals] of Object.entries(QUALIFIERS)) {
        const label = APP_NAMES[code];
        if (!label) continue;
        for (const q of quals) {
          const dir = path.join(resDir, `values-${q}`);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, "strings.xml"), stringsFile(label), "utf8");
          written += 1;
        }
      }
      console.log(`[withLocalizedAppName] ${written} dil icin app_name yazildi`);
      return cfg;
    },
  ]);

  return config;
};

module.exports = withLocalizedAppName;
module.exports.APP_NAMES = APP_NAMES;
module.exports.QUALIFIERS = QUALIFIERS;
