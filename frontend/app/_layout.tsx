import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";

import { AdsProvider } from "@/src/ads/AdsProvider";
import { useAppOpenAd } from "@/src/ads/useAppOpenAd";
import { AppErrorBoundary } from "@/src/components/AppErrorBoundary";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { FontScaleProvider } from "@/src/lib/fontScale";
import { StoreProvider, useStore } from "@/src/lib/store";

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
          <StoreProvider>
            <FontScaleProvider>
              <AdsProvider>
                <RootNavigator />
              </AdsProvider>
            </FontScaleProvider>
          </StoreProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}

function RootNavigator() {
  const { theme } = useStore();
  const { coldStartSettled, resumeGateVisible } = useAppOpenAd({
    gateColdStart: true,
  });

  useEffect(() => {
    if (coldStartSettled) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [coldStartSettled]);

  return (
    <View style={styles.root}>
      <ThemedStatusBar />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: "#06090E" },
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
          <Text style={[styles.resumeText, { color: theme.textMuted }]}>Yükleniyor…</Text>
        </View>
      ) : null}
    </View>
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
});
