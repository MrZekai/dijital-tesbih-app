// Locale'e duyarlı sayı / tarih biçimlendirme.
//
// Kural: sayıları ve tarihleri ASLA elle birleştirme. Arapça-Hint rakamları,
// binlik ayırıcılar, hafta gününün kısaltması ve ayın adı dile göre değişir;
// hepsi `Intl` üzerinden gelir. `Intl` bulunmayan/eksik olduğu durumlarda
// güvenli, çökmeyen yedeklere düşülür.

const numberCache = new Map<string, Intl.NumberFormat | null>();
const weekdayCache = new Map<string, Intl.DateTimeFormat | null>();
const dateCache = new Map<string, Intl.DateTimeFormat | null>();

function safeNumberFormat(bcp47: string): Intl.NumberFormat | null {
  if (numberCache.has(bcp47)) return numberCache.get(bcp47) ?? null;
  let f: Intl.NumberFormat | null = null;
  try {
    if (typeof Intl !== "undefined" && typeof Intl.NumberFormat === "function") {
      f = new Intl.NumberFormat(bcp47);
    }
  } catch {
    f = null;
  }
  numberCache.set(bcp47, f);
  return f;
}

/** Locale'e uygun sayı biçimi (binlik ayırıcı, rakam sistemi). */
export function formatNumber(value: number, bcp47: string): string {
  if (!Number.isFinite(value)) return "0";
  const f = safeNumberFormat(bcp47);
  if (f) {
    try {
      return f.format(value);
    } catch {
      // düş
    }
  }
  return String(value);
}

/**
 * Sayaç rakamları için "sade" biçim — binlik ayırıcı YOK.
 * Ana sayaç büyük puntoyla tek satırda durmalı; ayırıcı taşmaya yol açar.
 * Rakam sistemi yine locale'e uyar (ör. Arapça `٣٣`).
 */
export function formatCounter(value: number, bcp47: string): string {
  if (!Number.isFinite(value)) return "0";
  try {
    if (typeof Intl !== "undefined" && typeof Intl.NumberFormat === "function") {
      return new Intl.NumberFormat(bcp47, { useGrouping: false }).format(value);
    }
  } catch {
    // düş
  }
  return String(value);
}

/** Kısa hafta günü adı (ör. "Mon", "Пн", "الإثنين"). */
export function formatWeekdayShort(date: Date, bcp47: string): string {
  const key = bcp47;
  let f = weekdayCache.get(key);
  if (f === undefined) {
    try {
      f =
        typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function"
          ? new Intl.DateTimeFormat(bcp47, { weekday: "short" })
          : null;
    } catch {
      f = null;
    }
    weekdayCache.set(key, f);
  }
  if (f) {
    try {
      return f.format(date);
    } catch {
      // düş
    }
  }
  // Yedek: ISO hafta günü numarası.
  return String(((date.getDay() + 6) % 7) + 1);
}

/** Orta uzunlukta tarih (ör. "5 Sep 2026"). */
export function formatDateMedium(date: Date, bcp47: string): string {
  let f = dateCache.get(bcp47);
  if (f === undefined) {
    try {
      f =
        typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function"
          ? new Intl.DateTimeFormat(bcp47, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : null;
    } catch {
      f = null;
    }
    dateCache.set(bcp47, f);
  }
  if (f) {
    try {
      return f.format(date);
    } catch {
      // düş
    }
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Saat:dakika (hatırlatıcı saati). 24 saatlik gösterim locale'e bırakılır. */
export function formatTime(hour: number, minute: number, bcp47: string): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  try {
    if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
      return new Intl.DateTimeFormat(bcp47, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    }
  } catch {
    // düş
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Locale'e duyarlı küçük harfe çevirme (arama/karşılaştırma için).
 * Türkçe `I/İ` ve Azerice gibi diller için doğru davranır.
 */
export function localeLower(value: string, bcp47: string): string {
  try {
    return value.toLocaleLowerCase(bcp47);
  } catch {
    return value.toLowerCase();
  }
}

/** Aksan/harekeleri kaldırıp arama karşılaştırması için normalleştirir. */
export function normalizeForSearch(value: string, bcp47: string): string {
  const lowered = localeLower(value.trim(), bcp47);
  try {
    return lowered
      .normalize("NFD")
      // Latin birlesik aksanlari + Arapca hareke/tenvin isaretleri.
      .replace(/[\u0300-\u036F\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
  } catch {
    return lowered;
  }
}
