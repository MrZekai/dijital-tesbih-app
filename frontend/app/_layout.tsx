import { startGoalSession } from "@/src/lib/goalActions";
import { Stack, usePathname } from "expo-router";
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
import { StoreProvider, usePreferences, useStoreStatus } from "@/src/lib/store";
import { radius, spacing } from "@/src/lib/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

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
  useEffect(() => { startGoalSession(); }, []);
  const { theme } = usePreferences();
  const { t, ready } = useI18n();
  const { loaded, loadError, saveError, retryLoad, retrySave } = useStoreStatus();
  const pathname = usePathname();
  const { coldStartSettled, resumeGateVisible } = useAppOpenAd({
    gateColdStart: true,
    protectCounting: pathname === "/" || pathname === "/tesbihat",
    contentReady: ready && (loaded || loadError),
  });

  // Splash yalnız HEM reklam kapısı HEM de dil tercihi hazır olduğunda
  // kapanır. Aksi hâlde ilk kare yanlış dilde görünüp anında değişirdi.
  useEffect(() => {
    if (coldStartSettled && ready && (loaded || loadError)) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [coldStartSettled, ready, loaded, loadError]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ThemedStatusBar />
      {loaded ? <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: theme.bg },
        }}
      /> : <View style={styles.resumeGate}>
        <ActivityIndicator color={theme.gold} />
        <Text style={{ color: theme.text, padding: 24 }}>{t(loadError ? "storage.load_error" : "common.loading")}</Text>
        {loadError ? <Pressable accessibilityRole="button" onPress={retryLoad} style={styles.noticeBtn}>
          <Text style={{ color: theme.gold }}>{t("error.retry")}</Text>
        </Pressable> : null}
      </View>}
      {saveError ? <Pressable accessibilityRole="button" onPress={retrySave}
        style={[styles.saveNotice, { backgroundColor: theme.bgCard }]}>
        <Text style={{ color: theme.text }}>{t("storage.save_error")} · {t("error.retry")}</Text>
      </Pressable> : null}

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
  const { theme } = usePreferences();
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
  const { theme } = usePreferences();
  return <StatusBar style={theme.name === "dark" ? "light" : "dark"} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  saveNotice: { position: "absolute", top: 60, left: 16, right: 16, padding: 16, zIndex: 10000, borderRadius: 16 },
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
