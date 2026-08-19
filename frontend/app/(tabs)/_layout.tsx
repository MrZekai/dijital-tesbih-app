// Alt sekme yapısı — Ana Sayfa, Zikirlerim, İstatistikler, Ayarlar.

import { Ionicons } from "@expo/vector-icons";
import { BANNER_SLOT_HEIGHT } from "@/src/ads/adConfig";
import { BottomBanner } from "@/src/ads/BottomBanner";
import { useAppOpenAd } from "@/src/ads/useAppOpenAd";
import { useRespectfulInterstitial } from "@/src/ads/useRespectfulInterstitial";
import { markUserInteracted } from "@/src/ads/userActivity";
import { BlurView } from "expo-blur";
import { Tabs, usePathname } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFontScale } from "@/src/lib/fontScale";
import { useTabBarHeight } from "@/src/lib/layout";
import { useStore } from "@/src/lib/store";

// Banner'ın gösterileceği sekme rotaları. Bu liste dışındaki bir ekran
// (Tesbihat / Esmaül Hüsna / Özel Zikir) öne alındığında sekme banner'ı
// UNMOUNT edilir — görünmeyen bir banner'ın reklam istemesi AdMob'da
// "görünmeyen gösterim" ihlalidir.
const TAB_ROUTES = ["/", "/zikirlerim", "/istatistikler", "/ayarlar"];

export default function TabsLayout() {
  const { theme } = useStore();
  const insets = useSafeAreaInsets();
  const isDark = theme.name === "dark";
  const { width: screenW } = useWindowDimensions();
  const pathname = usePathname();
  // Büyük Yazı Modu sekme etiketlerine ve ikonlarına da uygulanır.
  const fontScale = useFontScale();
  const tabLabelSize = Math.round(11 * fontScale);
  // Ortak kaynaktan — ekranların alt boşluğuyla birebir aynı hesap.
  const tabBarHeight = useTabBarHeight();

  // Sekmeler arasi gecislerde gecis reklami.

  // Bekleme suresi ve sikliK kontrolu hook icinde (10 dk).

  const showInterstitial = useRespectfulInterstitial();

  // Uygulama one geldiginde acilis reklami (4 dk bekleme icinde).
  useAppOpenAd();

  const bannerVisible = TAB_ROUTES.includes(pathname);

  return (
    <View style={styles.root}>
      <Tabs
      screenListeners={{
        tabPress: () => {
          // Sekme degisimi de bir kullanici etkilesimidir.
          markUserInteracted();
          showInterstitial();
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.gold,
        tabBarInactiveTintColor: theme.textSubtle,
        tabBarLabelStyle: {
          fontSize: tabLabelSize,
          letterSpacing: 0.3,
          marginTop: -2,
        },
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
          backgroundColor:
            Platform.OS === "android"
              ? isDark
                ? "rgba(6,9,14,0.94)"
                : "rgba(244,241,230,0.94)"
              : "transparent",
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: insets.bottom,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={40}
              tint={isDark ? "dark" : "light"}
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? "rgba(6,9,14,0.6)" : "rgba(244,241,230,0.6)" },
              ]}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? "rgba(6,9,14,0.94)" : "rgba(244,241,230,0.94)" },
              ]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ana Sayfa",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipse-outline" size={size} color={color} />
          ),
          tabBarButtonTestID: "tab-home",
        }}
      />
      <Tabs.Screen
        name="zikirlerim"
        options={{
          title: "Zikirlerim",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
          tabBarButtonTestID: "tab-zikirlerim",
        }}
      />
      <Tabs.Screen
        name="istatistikler"
        options={{
          title: "İstatistikler",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
          tabBarButtonTestID: "tab-stats",
        }}
      />
      <Tabs.Screen
        name="ayarlar"
        options={{
          title: "Ayarlar",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
          tabBarButtonTestID: "tab-settings",
        }}
      />
      </Tabs>

      {/* ── SABİT REKLAM ALANI ───────────────────────────────────────────
          Banner sekme çubuğunun HEMEN ÜSTÜNDE, ekranın altına sabitlenmiş
          tek bir bileşendir.

          Neden ekranların içinde değil de burada:
            1) GÖRÜNÜRLÜK — eskiden banner Zikirlerim / İstatistikler /
               Ayarlar ekranlarında ScrollView'ın EN SONUNDAYDI; kullanıcı
               sayfayı sonuna kadar kaydırmadan reklamı hiç görmüyordu.
               Artık her sekmede, kaydırmadan bağımsız olarak görünür.
            2) POLİTİKA — dört sekmenin her birinde ayrı banner olduğunda,
               arka planda kalan (görünmeyen) sekmelerin banner'ları da
               reklam isteyip gösterim kaydediyordu. Bu, AdMob'da
               "görünmeyen gösterim" ihlalidir. Tek banner ile bu risk yok.
            3) Sekme değiştirirken banner yeniden yüklenmez (daha az istek,
               daha akıcı geçiş).

          Yükseklik `BANNER_SLOT_HEIGHT` ile SABİTTİR; reklam gelmese bile
          alan korunur. Ekranlar bu kadar alt boşluk bırakır. */}
      {bannerVisible ? (
        <View
          style={[styles.bannerAnchor, { bottom: tabBarHeight }]}
          testID="tabs-banner-anchor"
        >
          <BottomBanner tag="tabs" explicitWidth={Math.floor(screenW)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bannerAnchor: {
    position: "absolute",
    left: 0,
    right: 0,
    height: BANNER_SLOT_HEIGHT,
  },
});
