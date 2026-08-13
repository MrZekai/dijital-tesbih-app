import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AdsProvider } from "@/src/ads/AdsProvider";
import { StoreProvider } from "@/src/lib/store";

LogBox.ignoreAllLogs(true);

// PRESERVE: prewarm icon fonts before rendering to avoid vendor-path crash on Android
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* BUG-013: `initialMetrics` olmadan SafeAreaProvider ilk render'da
          top/bottom inset'leri 0 olarak baslatabilir (native olcum
          asenkron gelir) — bu, uygulama acilisinda kaydirilabilir
          ekranlarda icerigin kisa bir sure status bar'in ALTINDAN
          baslamasina yol aciyordu. `initialWindowMetrics` bu ilk olcum
          gecikmesini ortadan kaldirir. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StoreProvider>
          <AdsProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "fade",
                contentStyle: { backgroundColor: "#06090E" },
              }}
            />
          </AdsProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
