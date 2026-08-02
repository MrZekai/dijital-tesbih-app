// Zikirhane tema tokenları — koyu (varsayılan) ve açık tema.
// Renkler: koyu zümrüt yeşili + lacivert + siyah + yumuşak altın vurgular.

export type ThemeName = "dark" | "light";

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
  bg: "#06090E",
  bgElevated: "#0B121A",
  bgCard: "#111A22",
  surface: "#1C2A36",
  border: "#233342",
  borderStrong: "#C6A664",
  divider: "#16222D",
  text: "#F4F1E1",
  textMuted: "#C2BCA8",
  textSubtle: "#8A8778",
  gold: "#C6A664",
  goldSoft: "#8C7A46",
  emerald: "#16402D",
  emeraldDeep: "#0D2B1D",
  navy: "#0F1E33",
  danger: "#6B2727",
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
  borderStrong: "#8C7A46",
  divider: "#E0D8BF",
  text: "#0D2B1D",
  textMuted: "#3B4A3F",
  textSubtle: "#6A6355",
  gold: "#8C7A46",
  goldSoft: "#C6A664",
  emerald: "#0D2B1D",
  emeraldDeep: "#083020",
  navy: "#1C2A48",
  danger: "#8B3A3A",
  success: "#3F7A57",
  overlay: "rgba(244,241,230,0.75)",
};

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
