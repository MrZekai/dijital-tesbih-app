// Çoğul kategorileri — CLDR uyumlu.
//
// Öncelik `Intl.PluralRules`tır (Hermes/Android'de ICU ile gelir). ICU verisi
// bulunmayan bir ortamda çökmek yerine, dil ailesine göre elle yazılmış
// yedek kurallara düşeriz. Yedek kurallar yalnızca gerçekten farklı davranan
// diller için özelleşmiştir; diğerleri için "one/other" yeterlidir.

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/** Bir dilin kullandığı kategoriler — anahtar eşitliği testi bunu kullanır. */
export const PLURAL_CATEGORIES: Record<string, PluralCategory[]> = {
  ar: ["zero", "one", "two", "few", "many", "other"],
  ru: ["one", "few", "many", "other"],
  bs: ["one", "few", "other"],
  // Aşağıdaki diller CLDR'de tek biçimlidir (sayıya göre değişmez).
  id: ["other"],
  ms: ["other"],
  tr: ["one", "other"],
  fa: ["one", "other"],
  "fa-AF": ["one", "other"],
  ur: ["one", "other"],
  bn: ["one", "other"],
  ps: ["one", "other"],
  ckb: ["one", "other"],
  ku: ["one", "other"],
  dv: ["one", "other"],
  "pa-Arab": ["one", "other"],
  az: ["one", "other"],
  uz: ["one", "other"],
  kk: ["one", "other"],
  ky: ["one", "other"],
  tg: ["one", "other"],
  tk: ["one", "other"],
  sq: ["one", "other"],
  so: ["one", "other"],
  ha: ["one", "other"],
  sw: ["one", "other"],
  fr: ["one", "many", "other"],
  en: ["one", "other"],
};

function fallbackCategory(code: string, n: number): PluralCategory {
  const abs = Math.abs(n);
  const i = Math.floor(abs);

  switch (code) {
    case "ar": {
      const mod100 = i % 100;
      if (abs === 0) return "zero";
      if (abs === 1) return "one";
      if (abs === 2) return "two";
      if (mod100 >= 3 && mod100 <= 10) return "few";
      if (mod100 >= 11 && mod100 <= 99) return "many";
      return "other";
    }
    case "ru":
    case "bs": {
      const mod10 = i % 10;
      const mod100 = i % 100;
      if (mod10 === 1 && mod100 !== 11) return "one";
      if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "few";
      if (code === "bs") return "other";
      return "many";
    }
    case "fr":
      return abs < 2 ? "one" : "other";
    case "id":
    case "ms":
      return "other";
    default:
      return abs === 1 ? "one" : "other";
  }
}

const cache = new Map<string, Intl.PluralRules | null>();

function getRules(bcp47: string): Intl.PluralRules | null {
  if (cache.has(bcp47)) return cache.get(bcp47) ?? null;
  let rules: Intl.PluralRules | null = null;
  try {
    if (typeof Intl !== "undefined" && typeof Intl.PluralRules === "function") {
      rules = new Intl.PluralRules(bcp47);
    }
  } catch {
    rules = null;
  }
  cache.set(bcp47, rules);
  return rules;
}

/**
 * `count` için çoğul kategorisini döndürür.
 * `code` uygulama dil kodu, `bcp47` Intl etiketi.
 */
export function pluralCategory(
  code: string,
  bcp47: string,
  count: number
): PluralCategory {
  if (!Number.isFinite(count)) return "other";
  const rules = getRules(bcp47);
  if (rules) {
    try {
      return rules.select(count) as PluralCategory;
    } catch {
      // ICU verisi eksik → yedeğe düş.
    }
  }
  return fallbackCategory(code, count);
}
