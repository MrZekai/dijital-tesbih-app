// BottomBanner - dayanikli banner + tesbihat sonrasi geribildirim loglari.
//
// KRITIK: 3 sekmede (Zikirlerim/Istatistikler/Ayarlar) ScrollView icinde
// mount edilirken banner sorunsuz calisiyordu. Ana Sayfa'da flex:1 kardesin
// altindaki minHeight:62 slot icinde native tarafta ANCHORED_ADAPTIVE_BANNER
// olcumu belirsiz olabiliyordu. Cozum:
//   - Opsiyonel `explicitWidth` prop'u ile ANCHORED_ADAPTIVE_BANNER'a acik
//     genislik verebiliriz (Home bunu Dimensions.get('window').width ile
//     saglayacak).
//   - Yukleme sonucu (yuklendi / hata / kapak) tag'li olarak konsola yazilir
//     ki no-fill / kod hatasi ayrimini kullanici gorebilsin.

import React, { useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useStore } from "@/src/lib/store";
import { spacing } from "@/src/lib/theme";

import { bannerUnitId, isProductionAds } from "./adConfig";
import { useAds } from "./AdsProvider";
import { getAdsSdk } from "./sdk";

interface Props {
  bottomInset?: number;
  testID?: string;
  // Opsiyonel: adaptive banner icin sabit genislik (native olcum guvensiz
  // olan yerlerde). 0/undefined ise SDK ebeveynden olcer.
  explicitWidth?: number;
  // Log/hata mesajlarinda ayirt etmek icin (ornek: "home", "zikirlerim").
  tag?: string;
}

class AdBoundary extends React.Component<
  { children: React.ReactNode; tag?: string },
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
    return this.state.failed ? null : this.props.children;
  }
}

export function BottomBanner({
  bottomInset = 0,
  testID,
  explicitWidth,
  tag,
}: Props) {
  const { theme } = useStore();
  const { canRequestAds, adsEnabled } = useAds();
  const sdk = getAdsSdk();

  if (!adsEnabled || !canRequestAds || !sdk || !sdk.BannerAd) return null;

  return (
    <AdBoundary tag={tag}>
      <BannerSlot
        sdk={sdk}
        theme={theme}
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
  theme: ReturnType<typeof useStore>["theme"];
  tag: string;
}

function BannerSlot({
  sdk,
  theme,
  bottomInset = 0,
  testID,
  explicitWidth,
  tag,
}: SlotProps) {
  const bannerRef = useRef<unknown>(null);
  // Ek kalite iyilestirmesi: reklam yuklenemedigi (no-fill) durumda bos
  // "Reklam" etiketli alani EKRANDA TUTMAYIP tamamen kucultuyoruz.
  const [adStatus, setAdStatus] = useState<"loading" | "loaded" | "failed">(
    "loading"
  );

  const BannerAd = sdk.BannerAd as React.ComponentType<{
    ref?: React.MutableRefObject<unknown>;
    unitId: string;
    size: string;
    width?: number;
    onAdLoaded?: () => void;
    onAdFailedToLoad?: (err: unknown) => void;
    onAdOpened?: () => void;
    onAdClosed?: () => void;
    onPaid?: (event: unknown) => void;
  }>;

  const sizes = (sdk.BannerAdSize ?? {}) as Record<string, string>;
  // v16 icin ANCHORED_ADAPTIVE_BANNER standardidir; yedekleme guvence icin.
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

  // Ilk mount log'u — hata ayiklama icin faydali.
  const mountedRef = useRef(false);
  if (!mountedRef.current) {
    mountedRef.current = true;
    console.log(
      `[ads:banner:${tag}] mount unitId=${bannerUnitId} size=${size} explicitWidth=${
        explicitWidth ?? "auto"
      } prod=${isProductionAds}`
    );
  }

  // Ek kalite iyilestirmesi: no-fill durumunda alani gorsel olarak
  // kucult (0 yukseklik) — BannerAd bileseni MOUNTED kalir ki SDK'nin
  // kendi ic yenileme (refresh) mekanizmasi calisirsa slot geri gelebilir.
  const collapsed = adStatus === "failed";

  return (
    <View
      style={[
        styles.slot,
        collapsed
          ? styles.slotCollapsed
          : {
              marginBottom: bottomInset,
              backgroundColor: theme.bgElevated,
              borderTopColor: theme.divider,
            },
      ]}
      testID={testID ?? "bottom-banner-ad"}
      pointerEvents={collapsed ? "none" : "auto"}
    >
      {!collapsed ? (
        <Text style={[styles.label, { color: theme.textSubtle }]}>REKLAM</Text>
      ) : null}
      <BannerAd
        ref={bannerRef}
        unitId={bannerUnitId}
        size={size}
        width={explicitWidth}
        onAdLoaded={() => {
          setAdStatus("loaded");
          console.log(`[ads:banner:${tag}] loaded`);
        }}
        onAdFailedToLoad={(err) => {
          // Google Mobile Ads hata objesi: { code, message }
          const e = err as { code?: string; message?: string } | undefined;
          setAdStatus("failed");
          console.warn(
            `[ads:banner:${tag}] failed code=${e?.code ?? "?"} message="${
              e?.message ?? String(err)
            }" unitId=${bannerUnitId}`
          );
        }}
        onAdOpened={() => console.log(`[ads:banner:${tag}] opened`)}
        onAdClosed={() => console.log(`[ads:banner:${tag}] closed`)}
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
  // Ek kalite iyilestirmesi: reklam yuklenemedigi zaman bos alan tamamen
  // kucultulur (dead-space yok).
  slotCollapsed: {
    minHeight: 0,
    height: 0,
    paddingVertical: 0,
    borderTopWidth: 0,
    overflow: "hidden",
  },
  label: {
    // BUG-011: textTransform kaldirildi, metin dogrudan Türkçe buyuk
    // harfle yazildi.
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
});
