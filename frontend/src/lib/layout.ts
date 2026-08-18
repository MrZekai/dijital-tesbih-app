// Alt ekran "kroması" (sekme çubuğu + sabit reklam alanı) ölçüleri.
//
// Sekme çubuğu `position: "absolute"` olduğu için ekran içerikleri onun
// ALTINDAN geçer. Sabit banner da sekme çubuğunun hemen üstüne mutlak
// konumlandırılmıştır. Dolayısıyla her sekme ekranı, içeriğinin bu iki
// katmanın arkasında kalmaması için alttan bu kadar boşluk bırakmalıdır.
//
// Tek bir kaynaktan hesaplanır ki ekranlar arasında tutarsızlık olmasın
// (eskiden her ekran farklı sabit sayılar kullanıyordu: 100, 120, 78…).

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BANNER_SLOT_HEIGHT } from "@/src/ads/adConfig";

import { useFontScale } from "./fontScale";

/** Sekme çubuğunun güvenli alan hariç temel yüksekliği. */
export const TAB_BAR_BASE_HEIGHT = 60;

/** Sekme çubuğunun gerçek yüksekliği (Büyük Yazı Modu + güvenli alan dahil). */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  const fontScale = useFontScale();
  return (
    TAB_BAR_BASE_HEIGHT + Math.round((fontScale - 1) * 14) + insets.bottom
  );
}

/**
 * Sekme çubuğu + SABİT reklam alanının toplam yüksekliği.
 * Sekme ekranları içeriğinin alt boşluğunu buna göre ayarlar.
 */
export function useBottomChromeHeight(): number {
  return useTabBarHeight() + BANNER_SLOT_HEIGHT;
}
