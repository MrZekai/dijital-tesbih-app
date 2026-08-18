// Durum çubuğu (status bar) perdesi.
//
// QA BUG-013 — "Kaydırılan içerik durum çubuğunun altına giriyor"
// ─────────────────────────────────────────────────────────────────────────
// Rapor: İstatistikler ekranında sorun giderilmişti; ancak **Zikirlerim** ve
// **Ayarlar** ekranlarında kaydırma sırasında Arapça metinler ve
// "Ekranı Açık Tut" satırı doğrudan sistem saatiyle ÇAKIŞIYORDU.
//
// Kök neden: güvenli alan boşluğu `contentContainerStyle` içine
// (`paddingTop: insets.top`) veriliyordu. Bu boşluk İÇERİKLE BİRLİKTE
// KAYAR — yani ilk açılışta doğru görünür, kullanıcı listeyi yukarı
// kaydırdığında içerik durum çubuğunun altından geçer. Kapsayıcıya verilen
// `SafeAreaView` de yalnızca başlangıç konumunu düzeltir, kaydırılan
// içeriği durum çubuğundan gizlemez.
//
// Çözüm: içeriğin ÜSTÜNDE çizilen, durum çubuğu yüksekliğinde opak bir
// perde. Kaydırma ne olursa olsun bu bandın altına hiçbir metin sızamaz.
// Arka plan rengi ekranın zeminiyle aynı olduğu için görsel olarak fark
// edilmez; sadece çakışmayı keser.
//
// `pointerEvents="none"` → dokunuşları engellemez.

import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStore } from "@/src/lib/store";

interface Props {
  /** Zemin rengini geçersiz kıl (varsayılan: aktif temanın arka planı). */
  color?: string;
}

export function StatusBarScrim({ color }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useStore();

  if (insets.top <= 0) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.scrim,
        { height: insets.top, backgroundColor: color ?? theme.bg },
      ]}
      testID="status-bar-scrim"
    />
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    // Kaydırılan içeriğin ÜSTÜNDE kalmalı.
    zIndex: 50,
    elevation: 50,
  },
});
