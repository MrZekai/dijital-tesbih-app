import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";

import { AdsProvider } from "@/src/ads/AdsProvider";
import { useAppOpenAd } from "@/src/ads/useAppOpenAd";
import { AppErrorBoundary } from "@/src/components/AppErrorBoundary";
import { Text } from "@/src/components/AppText";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { I18nProvider, useI18n } from "@/src/i18n";
import { FontScaleProvider } from "@/src/lib/fontScale";
import { useDirection } from "@/src/lib/rtl";
import { StoreProvider, useStore } from "@/src/lib/store";
import { radius, spacing } from "@/src/lib/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (!loaded && !error) return;
    const failSafe = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 5000);
    return () => clearTimeout(failSafe);
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AppErrorBoundary tag="root">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          {/* i18n en dışta: tema, ayarlar ve hata ekranı da çeviri kullanır. */}
          <I18nProvider>
            <StoreProvider>
              <FontScaleProvider>
                <AdsProvider>
                  <RootNavigator />
                </AdsProvider>
              </FontScaleProvider>
            </StoreProvider>
          </I18nProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}

function RootNavigator() {
  const { theme } = useStore();
  const { t, ready } = useI18n();
  const { coldStartSettled, resumeGateVisible } = useAppOpenAd({
    gateColdStart: true,
  });

  // Splash yalnız HEM reklam kapısı HEM de dil tercihi hazır olduğunda
  // kapanır. Aksi hâlde ilk kare yanlış dilde görünüp anında değişirdi.
  useEffect(() => {
    if (coldStartSettled && ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [coldStartSettled, ready]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ThemedStatusBar />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: theme.bg },
        }}
      />

      {/* App-switch App Open yalnız bu loading gate üzerinde gösterilir. */}
      {resumeGateVisible ? (
        <View
          style={[styles.resumeGate, { backgroundColor: theme.bg }]}
          pointerEvents="auto"
          testID="app-open-resume-loading-gate"
        >
          <ActivityIndicator size="small" color={theme.gold} />
          <Text style={[styles.resumeText, { color: theme.textMuted }]}>
            {t("common.loading")}
          </Text>
        </View>
      ) : null}

      <RtlRestartNotice />
    </View>
  );
}

/**
 * RTL yönü değiştiğinde Android'de tam etki için yeniden başlatma gerekir.
 * Uygulamayı kendi başımıza kapatmayız (Play politikası ve kullanıcı
 * güveni açısından doğru değil); bunun yerine ne yapılması gerektiğini
 * açıkça söyleriz.
 */
function RtlRestartNotice() {
  const { theme } = useStore();
  const { t, restartRequired, dismissRestartNotice } = useI18n();
  const dir = useDirection();

  return (
    <Modal
      visible={restartRequired}
      transparent
      animationType="fade"
      onRequestClose={dismissRestartNotice}
    >
      <View style={[styles.noticeBackdrop, { backgroundColor: theme.overlay }]}>
        <View
          style={[
            styles.noticeCard,
            { backgroundColor: theme.bgCard, borderColor: theme.border },
          ]}
          testID="rtl-restart-notice"
        >
          <Text
            style={[
              styles.noticeTitle,
              { color: theme.text, textAlign: dir.textAlign },
            ]}
          >
            {t("common.restart_title")}
          </Text>
          <Text
            style={[
              styles.noticeBody,
              {
                color: theme.textMuted,
                textAlign: dir.textAlign,
                writingDirection: dir.writingDirection,
              },
            ]}
          >
            {t("common.restart_body")}
          </Text>
          <Pressable
            onPress={dismissRestartNotice}
            style={[styles.noticeBtn, { backgroundColor: theme.gold }]}
            accessibilityRole="button"
            testID="rtl-restart-dismiss"
          >
            <Text style={[styles.noticeBtnText, { color: theme.bg }]}>
              {t("common.restart_later")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ThemedStatusBar() {
  const { theme } = useStore();
  return <StatusBar style={theme.name === "dark" ? "light" : "dark"} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  resumeGate: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  resumeText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  noticeBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  noticeCard: {
    width: "100%",
    maxWidth: 420,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  noticeTitle: { fontSize: 18, fontWeight: "700" },
  noticeBody: { fontSize: 15, lineHeight: 22 },
  noticeBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  noticeBtnText: { fontSize: 15, fontWeight: "700" },
});
