// Paylaşılan giriş doğrulama yardımcıları.
//
// v1.1.0: Doğrulama artık METİN DÖNDÜRMEZ. Bir hata KODU döner ve arayüz
// bunu `t()` ile çevirir. Böylece aynı doğrulama mantığı 27 dilde çalışır
// ve iş mantığında hiçbir dil sabiti kalmaz.

import type { TranslationKey } from "@/src/i18n/locales/en";

export type ValidationErrorCode =
  | "validation.required"
  | "validation.positive_integer"
  | "validation.min"
  | "validation.max";

export interface PositiveIntResult {
  valid: boolean;
  value?: number;
  /** Çeviri anahtarı — arayüz `t(errorKey)` ile gösterir. */
  errorKey?: ValidationErrorCode;
}

export const MAX_TARGET = 1_000_000;

/**
 * Sadece pozitif TAM sayıları kabul eder.
 *
 * Çok dillilik notu: Bazı dillerde klavye Arapça-Hint (٠١٢…) veya Doğu
 * Arapça (۰۱۲…) veya Devanagari (০১২…) rakamları üretir. Bunları
 * reddetmek yerine ASCII karşılığına çeviririz — kullanıcı kendi
 * klavyesiyle hedef girebilmelidir.
 */
export function parsePositiveInteger(raw: string): PositiveIntResult {
  const trimmed = normalizeDigits(raw).trim();
  if (!trimmed) {
    return { valid: false, errorKey: "validation.required" };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, errorKey: "validation.positive_integer" };
  }
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n <= 0) {
    return { valid: false, errorKey: "validation.min" };
  }
  if (n > MAX_TARGET) {
    return { valid: false, errorKey: "validation.max" };
  }
  return { valid: true, value: n };
}

/** Latin dışı rakamları ASCII 0-9'a çevirir. */
export function normalizeDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    // Arapça-Hint ٠-٩
    if (code >= 0x0660 && code <= 0x0669) out += String(code - 0x0660);
    // Genişletilmiş Arapça-Hint (Farsça/Urduca) ۰-۹
    else if (code >= 0x06f0 && code <= 0x06f9) out += String(code - 0x06f0);
    // Bengalce ০-৯
    else if (code >= 0x09e6 && code <= 0x09ef) out += String(code - 0x09e6);
    // Divehi/Thaana kendi rakamını kullanmaz; ASCII beklenir.
    else out += ch;
  }
  return out;
}

/**
 * İsim çakışması kontrolü için normalleştirme.
 *
 * v1.1.0: Sabit `tr-TR` yerine çağıranın verdiği locale kullanılır.
 * Türkçe `I/İ` kuralı yalnızca Türkçe/Azerice arayüzde uygulanmalıdır;
 * aksi hâlde "Ilahi" gibi girdiler başka dillerde yanlış eşleşir.
 */
export function normalizeName(name: string, locale: string = "en"): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  try {
    return trimmed.toLocaleLowerCase(locale);
  } catch {
    return trimmed.toLowerCase();
  }
}

/** Tip güvenliği: hata kodları gerçek çeviri anahtarları olmalı. */
const _assertKeys: Record<ValidationErrorCode, TranslationKey> = {
  "validation.required": "validation.required",
  "validation.positive_integer": "validation.positive_integer",
  "validation.min": "validation.min",
  "validation.max": "validation.max",
};
void _assertKeys;
