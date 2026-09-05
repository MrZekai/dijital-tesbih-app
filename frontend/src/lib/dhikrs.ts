// Hazır zikir tanımları.
//
// v1.1.0 — ÇOK DİLLİ YAPI
// ───────────────────────
// Zikir adları artık kaynak kodda sabit Türkçe DEĞİLDİR. Her hazır zikrin
// bir `nameKey`i (çeviri anahtarı) vardır; görünen ad çalışma zamanında
// seçili dile göre çözülür. Arapça yazılış dilden bağımsızdır ve burada
// kalır.
//
// GERİYE DÖNÜK UYUMLULUK
// ──────────────────────
// `id` değerleri DEĞİŞMEDİ (`subhanallah`, `elhamdulillah`, …). Kalıcı
// veride sayaçlar bu id'lerle saklandığı için, mevcut kullanıcıların
// sayaçları bire bir korunur. Kullanıcının kendi oluşturduğu zikirler
// (`CustomDhikr`) serbest metindir ve olduğu gibi saklanır — onları
// çevirmeye çalışmayız.

import type { TranslationKey } from "@/src/i18n/locales/en";

export interface DhikrDef {
  id: string;
  /** Görünen ad için çeviri anahtarı. */
  nameKey: TranslationKey;
  /** Kısa anlam için çeviri anahtarı. */
  meaningKey: TranslationKey;
  arabic: string;
  defaultTarget: number;
  builtin: true;
}

export interface CustomDhikr {
  id: string;
  name: string;
  arabic?: string;
  defaultTarget: number;
  builtin: false;
  createdAt: number;
}

export type AnyDhikr = DhikrDef | CustomDhikr;

export const BUILTIN_DHIKRS: DhikrDef[] = [
  {
    id: "subhanallah",
    nameKey: "dhikr.subhanallah",
    meaningKey: "dhikr.subhanallah_meaning",
    arabic: "سُبْحَانَ ٱللَّٰهِ",
    defaultTarget: 33,
    builtin: true,
  },
  {
    id: "elhamdulillah",
    nameKey: "dhikr.elhamdulillah",
    meaningKey: "dhikr.elhamdulillah_meaning",
    arabic: "ٱلْحَمْدُ لِلَّٰهِ",
    defaultTarget: 33,
    builtin: true,
  },
  {
    id: "allahuekber",
    nameKey: "dhikr.allahuekber",
    meaningKey: "dhikr.allahuekber_meaning",
    arabic: "ٱللَّٰهُ أَكْبَرُ",
    defaultTarget: 33,
    builtin: true,
  },
  {
    id: "estagfirullah",
    nameKey: "dhikr.estagfirullah",
    meaningKey: "dhikr.estagfirullah_meaning",
    arabic: "أَسْتَغْفِرُ ٱللَّٰهَ",
    defaultTarget: 100,
    builtin: true,
  },
  {
    id: "salavat",
    nameKey: "dhikr.salavat",
    meaningKey: "dhikr.salavat_meaning",
    arabic: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ",
    defaultTarget: 100,
    builtin: true,
  },
  {
    id: "kelimeitevhid",
    nameKey: "dhikr.kelimeitevhid",
    meaningKey: "dhikr.kelimeitevhid_meaning",
    arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ",
    defaultTarget: 100,
    builtin: true,
  },
];

/**
 * Hedef ön ayarları. 1000 kullanıcı talebiyle eklendi; 500 korunuyor ki
 * mevcut kullanıcıların alışkanlığı bozulmasın.
 */
export const TARGET_PRESETS = [33, 99, 100, 500, 1000];

export function isBuiltin(d: AnyDhikr): d is DhikrDef {
  return d.builtin === true;
}

/** Zikrin görünen adı — hazır zikirler çevrilir, özel zikirler olduğu gibi. */
export function dhikrName(
  d: AnyDhikr,
  t: (key: TranslationKey) => string
): string {
  return isBuiltin(d) ? t(d.nameKey) : d.name;
}

/** Zikrin Arapça yazılışı (varsa). */
export function dhikrArabic(d: AnyDhikr): string | undefined {
  return d.arabic || undefined;
}

/** Kısa anlam — yalnızca hazır zikirlerde vardır. */
export function dhikrMeaning(
  d: AnyDhikr,
  t: (key: TranslationKey) => string
): string | undefined {
  return isBuiltin(d) ? t(d.meaningKey) : undefined;
}
