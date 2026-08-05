// Alt sekme yapısı — Ana Sayfa, Zikirlerim, İstatistikler, Ayarlar.

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStore } from "@/src/lib/store";

export default function TabsLayout() {
  const { theme } = useStore();
  const insets = useSafeAreaInsets();
  const isDark = theme.name === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.gold,
        tabBarInactiveTintColor: theme.textSubtle,
        tabBarLabelStyle: { fontSize: 11, letterSpacing: 0.3, marginTop: -2 },
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
          height: 60 + insets.bottom,
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
  );
}
