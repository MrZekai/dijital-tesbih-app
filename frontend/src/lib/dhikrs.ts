// Hazır zikir tanımları — Türkçe, Arapça yazılışı ile.

export interface DhikrDef {
  id: string;
  name: string; // Türkçe okunuş
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
    name: "Sübhanallah",
    arabic: "سُبْحَانَ ٱللَّٰهِ",
    defaultTarget: 33,
    builtin: true,
  },
  {
    id: "elhamdulillah",
    name: "Elhamdülillah",
    arabic: "ٱلْحَمْدُ لِلَّٰهِ",
    defaultTarget: 33,
    builtin: true,
  },
  {
    id: "allahuekber",
    name: "Allahu Ekber",
    arabic: "ٱللَّٰهُ أَكْبَرُ",
    defaultTarget: 33,
    builtin: true,
  },
  {
    id: "estagfirullah",
    name: "Estağfirullah",
    arabic: "أَسْتَغْفِرُ ٱللَّٰهَ",
    defaultTarget: 100,
    builtin: true,
  },
  {
    id: "salavat",
    name: "Salavat",
    arabic: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ",
    defaultTarget: 100,
    builtin: true,
  },
  {
    id: "kelimeitevhid",
    name: "Kelime-i Tevhid",
    arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ",
    defaultTarget: 100,
    builtin: true,
  },
];

export const TARGET_PRESETS = [33, 99, 100, 500];
