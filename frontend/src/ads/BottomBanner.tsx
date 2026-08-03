// BottomBanner — Zikirlerim, İstatistikler, Ayarlar altında güvenli banner.
// KULLANIM: Sadece sayaç OLMAYAN ekranlarda. Ana Sayfa'da KESİNLİKLE kullanılmaz.

import React, { useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useStore } from "@/src/lib/store";
import { spacing } from "@/src/lib/theme";

import { bannerUnitId } from "./adConfig";
import { useAds } from "./AdsProvider";
import { getAdsSdk } from "./sdk";

interface Props {
  // Alt tab bar yüksekliğinin üstünde bırakılacak boşluk (default: 0).
  bottomInset?: number;
  testID?: string;
}

export function BottomBanner({ bottomInset = 0, testID }: Props) {
  const { theme } = useStore();
  const { canRequestAds, adsEnabled } = useAds();
  const sdk = getAdsSdk();
  // Ref native modül yoksa da kullanılabilir; sadece SDK bulunduğunda mount edilir
  const bannerRef = useRef<unknown>(null);

  // SDK ve consent yoksa hiçbir şey render etme (yer bile tutma yok).
  if (!adsEnabled || !canRequestAds || !sdk) return null;

  const BannerAd = sdk.BannerAd as React.ComponentType<{
    ref?: React.MutableRefObject<unknown>;
    unitId: string;
    size: string;
    onAdFailedToLoad?: (err: unknown) => void;
  }>;

  const size = sdk.BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER;

  // iOS'ta foreground'a döndüğünde yeniden yükle
  sdk.useForeground(() => {
    if (Platform.OS === "ios") {
      const b = bannerRef.current as { load?: () => void } | null;
      b?.load?.();
    }
  });

  return (
    <View
      style={[
        styles.slot,
        {
          marginBottom: bottomInset,
          backgroundColor: theme.bgElevated,
          borderTopColor: theme.divider,
        },
      ]}
      accessible
      accessibilityLabel="Reklam alanı"
      testID={testID ?? "bottom-banner-ad"}
    >
      <Text style={[styles.label, { color: theme.textSubtle }]}>Reklam</Text>
      <BannerAd
        ref={bannerRef}
        unitId={bannerUnitId}
        size={size}
        onAdFailedToLoad={(err) => {
          console.warn("[ads] banner failed", err);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
});
