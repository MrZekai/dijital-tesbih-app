// Karşılama ekranı — 3 kısa tanıtım adımı.

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStore } from "@/src/lib/store";
import { fonts, radius, spacing } from "@/src/lib/theme";

const STEPS = [
  {
    icon: "sparkles-outline" as const,
    title: "Zikirlerini Kolayca Say",
    desc: "Ekranın herhangi bir yerine dokunarak zikrini rahatça çek. Tek elle, akıcı ve sade.",
  },
  {
    icon: "trophy-outline" as const,
    title: "Hedeflerini ve İlerlemeni Takip Et",
    desc: "Günlük, haftalık ve aylık istatistiklerinle manevi yolculuğunu görebilirsin.",
  },
  {
    icon: "moon-outline" as const,
    title: "Her Dokunuşta Huzur Bul",
    desc: "Sade tasarım, yumuşak animasyonlar ve dinginlik dolu bir zikir deneyimi.",
  },
];

export default function Onboarding() {
  const { theme, finishOnboarding } = useStore();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      finishOnboarding();
      router.replace("/(tabs)");
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    finishOnboarding();
    router.replace("/(tabs)");
  };

  const cur = STEPS[step];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <LinearGradient
        colors={[theme.emeraldDeep, theme.bg, theme.navy]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.topRow, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={skip} hitSlop={12} testID="onboarding-skip">
          <Text style={[styles.skip, { color: theme.textMuted }]}>Geç</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        <Animated.View
          key={`icon-${step}`}
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(200)}
          style={[
            styles.iconWrap,
            { borderColor: theme.gold, backgroundColor: theme.emeraldDeep },
          ]}
        >
          <Ionicons name={cur.icon} size={54} color={theme.gold} />
        </Animated.View>
        <Animated.Text
          key={`t-${step}`}
          entering={FadeIn.delay(80).duration(400)}
          style={[styles.title, { color: theme.gold, fontFamily: fonts.display }]}
        >
          {cur.title}
        </Animated.Text>
        <Animated.Text
          key={`d-${step}`}
          entering={FadeIn.delay(160).duration(400)}
          style={[styles.desc, { color: theme.textMuted }]}
        >
          {cur.desc}
        </Animated.Text>
      </View>

      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === step ? theme.gold : theme.border,
                width: i === step ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Pressable
          onPress={next}
          style={[styles.cta, { backgroundColor: theme.gold }]}
          testID="onboarding-next"
        >
          <Text style={[styles.ctaText, { color: theme.bg }]}>
            {isLast ? "Başla" : "Devam"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.xl,
  },
  skip: {
    fontSize: 15,
    letterSpacing: 0.4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    textAlign: "center",
    fontWeight: "300",
    letterSpacing: 0.5,
  },
  desc: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 340,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingBottom: spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottom: {
    paddingHorizontal: spacing.xl,
  },
  cta: {
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
