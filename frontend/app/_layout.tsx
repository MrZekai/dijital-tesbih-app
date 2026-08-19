import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";

import { AdsProvider } from "@/src/ads/AdsProvider";
import { useAppOpenAd } from "@/src/ads/useAppOpenAd";
import { AppErrorBoundary } from "@/src/components/AppErrorBoundary";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { FontScaleProvider } from "@/src/lib/fontScale";
import { StoreProvider, useStore } from "@/src/lib/store";

LogBox.ignoreAllLogs(true);

// Native splash, fontlar + güvenli cold-start reklam fırsatı bitene kadar kalır.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (!loaded && !error) return;
    // Son emniyet: reklam/UMP katmanında beklenmedik bir JS hatası olsa bile
    // native splash sonsuza kadar ekranda kalmasın. Normal akış 3 sn içinde
    // RootNavigator tarafından kapatılır; bu yalnız yedek emniyettir.
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
  // App Open artık yalnız burada, uygulamanın gerçek root/loading aşamasında
  // yönetilir. Tabs içinde mount edilmez; ana içerik açıldıktan sonra geç
  // yüklenen reklam cold-start gerekçesiyle gösterilemez.
  const { coldStartSettled } = useAppOpenAd({ gateColdStart: true });

  useEffect(() => {
    if (coldStartSettled) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [coldStartSettled]);

  return (
    <>
      <ThemedStatusBar />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: "#06090E" },
        }}
      />
    </>
  );
}

function ThemedStatusBar() {
  const { theme } = useStore();
  return <StatusBar style={theme.name === "dark" ? "light" : "dark"} />;
}
