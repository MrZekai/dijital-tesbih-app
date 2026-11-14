// Adaptive banner: measured height is shared with the screen inset. No clipping.
import React, { useRef, useState, useCallback } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { BANNER_SLOT_HEIGHT, bannerUnitId } from "./adConfig";
import { useAds } from "./AdsProvider";
import { getAdsSdk } from "./sdk";

interface Props {
  bottomInset?: number;
  reservedHeight?: number;
  onHeightChange?: (height: number) => void;
  testID?: string;
  /** Adaptive banner için açık genişlik (native ölçümün güvensiz olduğu yerlerde). */
  explicitWidth?: number;
  /** Log/hata mesajlarında ayırt etmek için (örnek: "tabs", "esma"). */
  tag?: string;
}

class AdBoundary extends React.Component<
  { children: React.ReactNode; tag?: string; fallback: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn(`[ads:banner:${this.props.tag ?? "unknown"}] boundary caught`, err);
  }
  render() {
    // Hata durumunda bile ALAN KORUNUR (düzen zıplamasın), ama görünmez.
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function BottomBanner({
  bottomInset = 0,
  reservedHeight = BANNER_SLOT_HEIGHT,
  onHeightChange,
  testID,
  explicitWidth,
  tag,
}: Props) {
  const { canRequestAds, adsEnabled, fullScreenAdActive } = useAds();
  const sdk = getAdsSdk();

  // Boş — ama AYNI YÜKSEKLİKTE — yer tutucu. Hiçbir görsel iz bırakmaz.
  const placeholder = (
    <View
      style={[styles.slot, { marginBottom: bottomInset, minHeight: reservedHeight }]}
      testID={testID ?? "bottom-banner-placeholder"}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );

  // App Open gibi tam ekran bir reklam gösterilirken banner native view'ını
  // tamamen unmount et (Google App Open rehberi: reklam üstüne reklam yok).
  if (fullScreenAdActive || !adsEnabled || !canRequestAds || !sdk || !sdk.BannerAd) {
    return placeholder;
  }

  return (
    <AdBoundary tag={tag} fallback={placeholder}>
      <BannerSlot
        sdk={sdk}
        reservedHeight={reservedHeight}
        onHeightChange={onHeightChange}
        bottomInset={bottomInset}
        testID={testID}
        explicitWidth={explicitWidth}
        tag={tag ?? "unknown"}
      />
    </AdBoundary>
  );
}

interface SlotProps extends Props {
  sdk: NonNullable<ReturnType<typeof getAdsSdk>>;
  tag: string;
}

function BannerSlot({
  sdk,
  bottomInset = 0,
  reservedHeight = BANNER_SLOT_HEIGHT,
  onHeightChange,
  testID,
  explicitWidth,
  tag,
}: SlotProps) {
  const bannerRef = useRef<unknown>(null);
  const [height, setHeight] = useState(reservedHeight);
  const acceptSize = useCallback((size: { width: number; height: number }) => {
    if (!Number.isFinite(size.height) || size.height <= 0) return;
    const measured = Math.max(BANNER_SLOT_HEIGHT, Math.ceil(size.height));
    setHeight(measured);
    onHeightChange?.(measured);
  }, [onHeightChange]);

  const BannerAd = sdk.BannerAd as React.ComponentType<{
    ref?: React.MutableRefObject<unknown>;
    unitId: string;
    size: string;
    width?: number;
    onAdLoaded?: (dimensions: { width: number; height: number }) => void;
    onSizeChange?: (dimensions: { width: number; height: number }) => void;
    onAdFailedToLoad?: (err: unknown) => void;
    onAdOpened?: () => void;
    onAdClosed?: () => void;
  }>;

  const sizes = (sdk.BannerAdSize ?? {}) as Record<string, string>;
  const size =
    sizes.ANCHORED_ADAPTIVE_BANNER ??
    sizes.ADAPTIVE_BANNER ??
    sizes.BANNER ??
    "BANNER";

  if (typeof sdk.useForeground === "function") {
    sdk.useForeground(() => {
      if (Platform.OS === "ios") {
        const b = bannerRef.current as { load?: () => void } | null;
        b?.load?.();
      }
    });
  }

  return (
    <View
      style={[styles.slot, { marginBottom: bottomInset, minHeight: height }]}
      testID={testID ?? "bottom-banner-ad"}
    >
      {/* Reklam yüklenemese bile bileşen MOUNTED kalır — SDK'nın kendi
          otomatik yenileme döngüsü çalıştığında slot kendiliğinden dolar.
          Alan hiçbir koşulda daraltılmaz ve boş kutu gösterilmez. */}
      <BannerAd
        ref={bannerRef}
        unitId={bannerUnitId}
        size={size}
        width={explicitWidth}
        onSizeChange={acceptSize}
        onAdLoaded={(dimensions) => {
          acceptSize(dimensions);
          if (__DEV__) console.log(`[ads:banner:${tag}] loaded`);
        }}
        onAdFailedToLoad={(err) => {
          // Kullanıcıya HİÇBİR mesaj gösterilmez; yalnızca geliştirme logu.
          if (__DEV__) {
            const e = err as { code?: string; message?: string } | undefined;
            console.warn(
              `[ads:banner:${tag}] failed code=${e?.code ?? "?"} message="${
                e?.message ?? String(err)
              }"`
            );
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    // Minimum placeholder size; native adaptive height can expand the slot.
    // ama kenarlık/dolgu/etiket YOKTUR.
    minHeight: BANNER_SLOT_HEIGHT,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",

  },
});
