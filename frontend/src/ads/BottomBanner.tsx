// BottomBanner — SABİT YÜKSEKLİKLİ, GÖRÜNMEZ ÇERÇEVELİ banner alanı.
//
// v1.1.0 yerleşim politikası
// ──────────────────────────
// Kullanıcı geri bildirimi: banner'ın üstündeki "REKLAM / Advertisement"
// etiketi ve "Reklam yüklenemedi" mesajı ekranı kirletiyordu. İkisi de
// KALDIRILDI.
//
//   - Alan HER DURUMDA aynı yükseklikte ayrılır (`BANNER_SLOT_HEIGHT`).
//     Reklam gelse de gelmese de düzen ZIPLAMAZ.
//   - Reklam yokken alan TAMAMEN GÖRÜNMEZDİR: etiket yok, çerçeve yok,
//     dolgu rengi yok, hata metni yok. Kullanıcı boş bir kutu görmez.
//   - Yükleme hataları yalnızca geliştirme loglarına yazılır.
//   - Banner yalnızca EKRANDA GÖRÜNÜR olduğunda mount edilir; görünmeyen
//     ekranlarda mount edilmez (AdMob "görünmeyen gösterim" ihlali).
//   - Alan sekme çubuğunun hemen üstünde sabittir ve tıklanabilir
//     kontrollerle arasında güvenli boşluk bırakılır (yanlış tıklama
//     önlemi) — bkz. `src/lib/layout.ts`.
//
// NOT: Google'ın yayıncı politikası reklamın içerikten AYIRT EDİLEBİLİR
// olmasını ister; bunu ayrı bir "REKLAM" yazısı değil, banner'ın kendi
// AdChoices işareti ve sekme çubuğundan ayrılmış konumu sağlar.

import React, { useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { BANNER_SLOT_HEIGHT, bannerUnitId } from "./adConfig";
import { useAds } from "./AdsProvider";
import { getAdsSdk } from "./sdk";

interface Props {
  bottomInset?: number;
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
  testID,
  explicitWidth,
  tag,
}: Props) {
  const { canRequestAds, adsEnabled, fullScreenAdActive } = useAds();
  const sdk = getAdsSdk();

  // Boş — ama AYNI YÜKSEKLİKTE — yer tutucu. Hiçbir görsel iz bırakmaz.
  const placeholder = (
    <View
      style={[styles.slot, { marginBottom: bottomInset }]}
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
  testID,
  explicitWidth,
  tag,
}: SlotProps) {
  const bannerRef = useRef<unknown>(null);

  const BannerAd = sdk.BannerAd as React.ComponentType<{
    ref?: React.MutableRefObject<unknown>;
    unitId: string;
    size: string;
    width?: number;
    onAdLoaded?: () => void;
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
      style={[styles.slot, { marginBottom: bottomInset }]}
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
        onAdLoaded={() => {
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
    // SABİT yükseklik — reklam gelse de gelmese de alan aynı kalır,
    // ama kenarlık/dolgu/etiket YOKTUR.
    height: BANNER_SLOT_HEIGHT,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
});
