// Desteklenen diller — tek kaynak.
//
// Yeni bir dil eklemek için:
//   1) Buraya bir `LanguageMeta` girdisi ekle.
//   2) `src/i18n/locales/<code>.ts` dosyasını oluştur (en.ts'yi şablon al).
//   3) `src/i18n/locales/index.ts` içindeki kayıt tablosuna ekle.
// Başka hiçbir yerde değişiklik gerekmez. Eksik anahtarlar otomatik olarak
// İngilizceye düşer; uygulama asla çökmez.

export type LanguageCode =
  | "en"
  | "tr"
  | "ar"
  | "id"
  | "ms"
  | "ur"
  | "fa"
  | "bn"
  | "fr"
  | "ru"
  | "az"
  | "uz"
  | "kk"
  | "ky"
  | "tg"
  | "tk"
  | "ps"
  | "sq"
  | "bs"
  | "so"
  | "ha"
  | "sw"
  | "ku"
  | "ckb"
  | "dv"
  | "fa-AF"
  | "pa-Arab";

export interface LanguageMeta {
  /** Uygulama içi dil kodu (kalıcı olarak saklanan değer). */
  code: LanguageCode;
  /**
   * `Intl` API'lerine verilecek BCP-47 etiketi. Bazı dillerde uygulama
   * kodundan farklıdır (ör. `ckb` → `ckb-IQ`, `pa-Arab` → `pa-Arab-PK`).
   * Cihazda ICU verisi yoksa `format.ts` güvenli yedeklere düşer.
   */
  bcp47: string;
  /** Dil seçicide gösterilen, dilin KENDİ yazısındaki adı. */
  nativeName: string;
  /** İngilizce adı (arama ve tanılama için). */
  englishName: string;
  /** Sağdan sola yazım. */
  rtl: boolean;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: "en", bcp47: "en", nativeName: "English", englishName: "English", rtl: false },
  { code: "tr", bcp47: "tr", nativeName: "Türkçe", englishName: "Turkish", rtl: false },
  { code: "ar", bcp47: "ar", nativeName: "العربية", englishName: "Arabic", rtl: true },
  { code: "id", bcp47: "id", nativeName: "Bahasa Indonesia", englishName: "Indonesian", rtl: false },
  { code: "ms", bcp47: "ms", nativeName: "Bahasa Melayu", englishName: "Malay", rtl: false },
  { code: "ur", bcp47: "ur", nativeName: "اردو", englishName: "Urdu", rtl: true },
  { code: "fa", bcp47: "fa", nativeName: "فارسی", englishName: "Persian", rtl: true },
  { code: "bn", bcp47: "bn", nativeName: "বাংলা", englishName: "Bengali", rtl: false },
  { code: "fr", bcp47: "fr", nativeName: "Français", englishName: "French", rtl: false },
  { code: "ru", bcp47: "ru", nativeName: "Русский", englishName: "Russian", rtl: false },
  { code: "az", bcp47: "az", nativeName: "Azərbaycan dili", englishName: "Azerbaijani", rtl: false },
  { code: "uz", bcp47: "uz", nativeName: "O‘zbek", englishName: "Uzbek", rtl: false },
  { code: "kk", bcp47: "kk", nativeName: "Қазақша", englishName: "Kazakh", rtl: false },
  { code: "ky", bcp47: "ky", nativeName: "Кыргызча", englishName: "Kyrgyz", rtl: false },
  { code: "tg", bcp47: "tg", nativeName: "Тоҷикӣ", englishName: "Tajik", rtl: false },
  { code: "tk", bcp47: "tk", nativeName: "Türkmençe", englishName: "Turkmen", rtl: false },
  { code: "ps", bcp47: "ps", nativeName: "پښتو", englishName: "Pashto", rtl: true },
  { code: "sq", bcp47: "sq", nativeName: "Shqip", englishName: "Albanian", rtl: false },
  { code: "bs", bcp47: "bs", nativeName: "Bosanski", englishName: "Bosnian", rtl: false },
  { code: "so", bcp47: "so", nativeName: "Soomaali", englishName: "Somali", rtl: false },
  { code: "ha", bcp47: "ha", nativeName: "Hausa", englishName: "Hausa", rtl: false },
  { code: "sw", bcp47: "sw", nativeName: "Kiswahili", englishName: "Swahili", rtl: false },
  { code: "ku", bcp47: "ku", nativeName: "Kurdî", englishName: "Kurdish (Kurmanji)", rtl: false },
  { code: "ckb", bcp47: "ckb-IQ", nativeName: "کوردیی ناوەندی", englishName: "Kurdish (Sorani)", rtl: true },
  { code: "dv", bcp47: "dv", nativeName: "ދިވެހި", englishName: "Dhivehi", rtl: true },
  { code: "fa-AF", bcp47: "fa-AF", nativeName: "دری", englishName: "Dari", rtl: true },
  { code: "pa-Arab", bcp47: "pa-Arab-PK", nativeName: "پنجابی", englishName: "Punjabi (Shahmukhi)", rtl: true },
];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

const BY_CODE = new Map<string, LanguageMeta>(
  LANGUAGES.map((l) => [l.code.toLowerCase(), l])
);

export function getLanguageMeta(code: string): LanguageMeta | undefined {
  return BY_CODE.get(code.toLowerCase());
}

export function isRtlLanguage(code: string): boolean {
  return getLanguageMeta(code)?.rtl ?? false;
}

/**
 * Cihaz/kullanıcı etiketini desteklenen bir dile eşler.
 *
 * Sıra:
 *   1) Tam eşleşme            (`pa-Arab` → `pa-Arab`)
 *   2) Yazı sistemi duyarlı   (`pa-Arab-PK` → `pa-Arab`)
 *   3) Bölge özel durumları   (`fa-AF`, `fa_AF` → Dari)
 *   4) Yalnızca dil kısmı     (`tr-TR` → `tr`)
 *   5) Eşdeğer kodlar         (`in` → `id`, `iw` → `he` benzeri eski ISO)
 *   6) `null` (çağıran taraf İngilizceye düşer)
 */
export function resolveLanguage(rawTag: string | null | undefined): LanguageCode | null {
  if (!rawTag) return null;
  const tag = rawTag.replace(/_/g, "-").trim();
  if (!tag) return null;

  const exact = getLanguageMeta(tag);
  if (exact) return exact.code;

  const parts = tag.split("-");
  const lang = (parts[0] || "").toLowerCase();
  const rest = parts.slice(1).map((p) => p.toLowerCase());

  // Farsça + Afganistan → Dari (ayrı dil girdisi).
  if (lang === "fa" && rest.includes("af")) return "fa-AF";
  // Pencapça + Arap yazısı → Shahmukhi.
  if (lang === "pa" && rest.includes("arab")) return "pa-Arab";
  // Pencapça Gurmukhi yazısı desteklenmiyor → eşleşme yok.
  if (lang === "pa") return null;
  // Kürtçe: Arap yazısı → Sorani, aksi hâlde Kurmanji.
  if (lang === "ku" && rest.includes("arab")) return "ckb";
  // Eski ISO 639 kodları (Android bazı cihazlarda hâlâ döndürür).
  if (lang === "in") return "id";
  if (lang === "ji") return null;

  const byLang = getLanguageMeta(lang);
  return byLang ? byLang.code : null;
}
