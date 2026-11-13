// Zikirhane tema tokenları — koyu (varsayılan), açık ve SİSTEM teması.
// Renkler: koyu zümrüt yeşili + lacivert + siyah + yumuşak altın vurgular.
//
// v1.1.0: `system` seçeneği eklendi. Kalıcı veride `settings.theme` hâlâ
// "dark" | "light" değerlerini alabilir (eski kayıtlar), artık "system" de
// geçerlidir. Çözümleme `resolveThemeName()` ile yapılır.

export type ThemeName = "dark" | "light";
export type ThemePreference = ThemeName | "system";

export interface ThemeTokens {
  name: ThemeName;
  bg: string;
  bgElevated: string;
  bgCard: string;
  surface: string;
  border: string;
  borderStrong: string;
  divider: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  gold: string;
  goldSoft: string;
  emerald: string;
  emeraldDeep: string;
  navy: string;
  danger: string;
  success: string;
  overlay: string;
}

export const darkTheme: ThemeTokens = {
  name: "dark",
  bg: "#091912",
  bgElevated: "#10241B",
  bgCard: "#11271E",
  surface: "#1B3327",
  border: "#2D4638",
  borderStrong: "#C6A664",
  divider: "#20382B",
  text: "#F4F1E1",
  textMuted: "#C2BCA8",
  textSubtle: "#8A8778",
  gold: "#C6A664",
  goldSoft: "#8C7A46",
  emerald: "#16402D",
  emeraldDeep: "#0D2B1D",
  navy: "#0F1E33",
  danger: "#F1A6A6",
  success: "#2D5A3F",
  overlay: "rgba(6,9,14,0.75)",
};

export const lightTheme: ThemeTokens = {
  name: "light",
  bg: "#F4F1E6",
  bgElevated: "#EDE7D3",
  bgCard: "#FFFFFF",
  surface: "#E8E2D2",
  border: "#D9CFB2",
  // Açık temada altın metin kontrastı düşüktü; kenarlık/vurgu için daha
  // koyu bir ton kullanılır (WCAG AA hedefi).
  borderStrong: "#7A6733",
  divider: "#E0D8BF",
  text: "#0D2B1D",
  textMuted: "#3B4A3F",
  textSubtle: "#5A5346",
  gold: "#7A6733",
  goldSoft: "#B08F45",
  emerald: "#0D2B1D",
  emeraldDeep: "#E8EEE5",
  navy: "#F4F1E6",
  danger: "#8B3A3A",
  success: "#2F6244",
  overlay: "rgba(244,241,230,0.75)",
};

/** Kullanıcı tercihini ve cihaz şemasını birleştirip somut temayı verir. */
export function resolveThemeName(
  preference: ThemePreference | undefined,
  systemScheme: "light" | "dark" | null | undefined
): ThemeName {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  // "system" veya bilinmeyen/eksik değer
  return systemScheme === "light" ? "light" : "dark";
}

export const getTheme = (name: ThemeName): ThemeTokens =>
  name === "light" ? lightTheme : darkTheme;

export const radius = { sm: 6, md: 12, lg: 20, xl: 28, pill: 999 };
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

export const fonts = {
  display: "serif" as const, // premium serif fallback (Cormorant Garamond feel)
  body: "System" as const,
};
