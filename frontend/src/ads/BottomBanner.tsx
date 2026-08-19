// BottomBanner — SABİT YÜKSEKLİKLİ, HER ZAMAN GÖRÜNÜR banner alanı.
//
// v1.0.17 yerleşim politikası
// ───────────────────────────
// Reklam alanı layout'ta ÖNCEDEN BELİRLENMİŞ, sabit yükseklikli
// (`BANNER_SLOT_HEIGHT`) ve her zaman görünür bir bölgedir:
//
//   - Alan HER DURUMDA ayrılır. Reklam yüklenmese de (no-fill), onay
//     beklenirken de, SDK hazır değilken de yükseklik AYNI kalır.
//     (Önceki sürümde no-fill durumunda alan 0'a daraltılıyordu; bu,
//     ekran düzeninin aniden zıplamasına ve reklam alanının "kaybolmasına"
//     yol açıyordu.)
//   - Sekme ekranlarında banner ScrollView'ın İÇİNDE değil, sekme
//     çubuğunun hemen ÜSTÜNDE sabittir → kullanıcı aşağı kaydırmasa bile
//     görünür (bkz. app/(tabs)/_layout.tsx).
//   - Alanın üstünde küçük "REKLAM" etiketi bulunur (Google'ın önerdiği
//     içerik/reklam ayrımı).
//
// AdMob politika notu: Banner yalnızca EKRANDA GÖRÜNÜR olduğunda mount
// edilir. Görünmeyen ekranlarda banner mount edilmez — aksi halde
// "görünmeyen gösterim" (invisible impression) ihlali oluşur.

import React, { useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useStore } from "@/src/lib/store";

import { BANNER_SLOT_HEIGHT, bannerUnitId } from "./adConfig";
import { useAds } from "./AdsProvider";
import { getAdsSdk } from "./sdk";

interface Props {
  bottomInset?: number;
  testID?: string;
  // Adaptive banner icin acik genislik (native olcumun guvensiz oldugu
  // yerlerde). 0/undefined ise SDK ebeveynden olcer.
  explicitWidth?: number;
  // Log/hata mesajlarinda ayirt etmek icin (ornek: "tabs", "esma").
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
    // Hata durumunda bile ALAN KORUNUR (düzen zıplamasın).
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function BottomBanner({
  bottomInset = 0,
  testID,
  explicitWidth,
  tag,
}: Props) {
  const { theme } = useStore();
  const { canRequestAds, adsEnabled, fullScreenAdActive } = useAds();
  const sdk = getAdsSdk();

  const slotStyle = [
    styles.slot,
    {
      marginBottom: bottomInset,
      backgroundColor: theme.bgElevated,
      borderTopColor: theme.divider,
    },
  ];

  // Boş (ama AYNI YÜKSEKLİKTE) yer tutucu — reklam pasifken / onay
  // beklenirken / native modül yokken gösterilir.
  const placeholder = (
    <View
      style={slotStyle}
      testID={testID ?? "bottom-banner-placeholder"}
      pointerEvents="none"
    >
      <Text style={[styles.label, { color: theme.textSubtle }]}>REKLAM</Text>
    </View>
  );

  // App Open gibi tam ekran bir reklam gösterilirken banner native view'ını
  // tamamen unmount et. Google App Open rehberi, App Open reklamının başka
  // bir reklamın (ör. banner) üstünde gösterilmemesini önerir. Alanın kendisi
  // korunur; yalnız BannerAd kaldırılır.
  if (fullScreenAdActive || !adsEnabled || !canRequestAds || !sdk || !sdk.BannerAd) {
    return placeholder;
  }

  return (
    <AdBoundary tag={tag} fallback={placeholder}>
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
      }`
    );
  }

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
      testID={testID ?? "bottom-banner-ad"}
    >
      <Text style={[styles.label, { color: theme.textSubtle }]}>REKLAM</Text>
      {/* Reklam yüklenemese bile bileşen MOUNTED kalır — SDK'nin kendi
          otomatik yenileme döngüsü çalıştığında slot kendiliğinden dolar.
          Alan hiçbir koşulda daraltılmaz. */}
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
      {adStatus === "failed" ? (
        // Alan korunur, ama boş kutunun ne olduğu belli olsun.
        <Text style={[styles.hint, { color: theme.textSubtle }]}>
          Reklam yüklenemedi
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    // SABİT yükseklik — reklam gelse de gelmese de alan aynı kalır.
    height: BANNER_SLOT_HEIGHT,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  label: {
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 1,
  },
  hint: {
    fontSize: 10,
    marginTop: 1,
  },
});
