// Namaz Sonrası Tesbihat — 33 Sübhanallah → 33 Elhamdülillah → 33 Allahu Ekber.
// Her aşama tamamlandığında otomatik olarak sonraki zikre geçer.

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TesbihRing } from "@/src/components/TesbihRing";
import { useRespectfulInterstitial } from "@/src/ads/useRespectfulInterstitial";
import { useStore } from "@/src/lib/store";
import { fonts, radius, spacing } from "@/src/lib/theme";

// BUG-002: bu id'ler `dhikrs.ts` icindeki BUILTIN_DHIKRS ile eslesir —
// böylece tesbihat sayimlari AYNI canonical zikir kaydina (ve dolayisiyla
// toplam/günlük/haftalık/aylık istatistiklere) akar.
const STEPS = [
  { id: "subhanallah", name: "Sübhanallah", arabic: "سُبْحَانَ ٱللَّٰهِ", target: 33 },
  { id: "elhamdulillah", name: "Elhamdülillah", arabic: "ٱلْحَمْدُ لِلَّٰهِ", target: 33 },
  { id: "allahuekber", name: "Allahu Ekber", arabic: "ٱللَّٰهُ أَكْبَرُ", target: 33 },
];

export default function Tesbihat() {
  const { theme, state, incrementDhikrById } = useStore();
  const insets = useSafeAreaInsets();
  const [stepIdx, setStepIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const showInterstitial = useRespectfulInterstitial();

  const scale = useSharedValue(1);
  const step = STEPS[stepIdx];

  const doHaptic = (success: boolean) => {
    if (!state.settings.vibration) return;
    if (success)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // BUG-010 duzeltmesi: onceden asama gecisinde 350ms'lik bir "engelleme
  // penceresi" (setTimeout + transitioningRef) vardi; bu pencerede gelen
  // dokunuslar SESSIZCE ATILIYORDU (hizli/surekli dokunusta kayip). Simdi
  // asama gecisi AYNI state guncellemesi icinde, ANINDA ve senkron olarak
  // yapiliyor — hicbir dokunus icin "olu zaman" yok, cift sayim da yok.
  const onTap = () => {
    if (done) return;
    // BUG-002: canonical istatistik/gecmis mekanizmasina dokunusu isle.
    incrementDhikrById(step.id);
    scale.value = withSequence(
      withTiming(0.94, { duration: 80 }),
      withTiming(1, { duration: 160 })
    );
    setCount((prev) => {
      const next = prev + 1;
      if (next >= step.target) {
        doHaptic(true);
        if (stepIdx < STEPS.length - 1) {
          // Sonraki asamaya ANINDA gec — dokunus kaybina yol acan bekleme
          // penceresi yok. Gecis animasyonu (FadeIn) gorsel olarak devam
          // eder, ancak sayimi ASLA bloklamaz.
          setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
          return 0;
        } else {
          setDone(true);
        }
      } else {
        doHaptic(false);
      }
      return next;
    });
  };

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const progress = Math.min(1, count / step.target);

  if (done) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <LinearGradient
          colors={[theme.emeraldDeep, theme.bg, theme.navy]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.done, { paddingTop: insets.top }]}>
          <Animated.View
            entering={FadeIn.duration(500)}
            style={[
              styles.doneBadge,
              { borderColor: theme.gold, backgroundColor: theme.emeraldDeep },
            ]}
          >
            <Ionicons name="checkmark" size={44} color={theme.gold} />
          </Animated.View>
          <Text
            style={[
              styles.doneTitle,
              { color: theme.gold, fontFamily: fonts.display },
            ]}
          >
            Tesbihat Tamamlandı
          </Text>
          <Text style={[styles.doneSub, { color: theme.textMuted }]}>
            Allah kabul etsin.
          </Text>
          <View style={{ height: 40 }} />
          <Pressable
            onPress={() => {
              setDone(false);
              setStepIdx(0);
              setCount(0);
            }}
            style={[styles.ctaGhost, { borderColor: theme.gold }]}
            testID="tesbihat-restart"
          >
            <Text style={{ color: theme.gold, fontSize: 15, fontWeight: "600" }}>
              Yeniden Başla
            </Text>
          </Pressable>
          <Pressable
            onPress={() => showInterstitial(() => router.back())}
            style={[styles.ctaSolid, { backgroundColor: theme.gold }]}
            testID="tesbihat-back"
          >
            <Text style={{ color: theme.bg, fontSize: 15, fontWeight: "700" }}>
              Ana Sayfaya Dön
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <LinearGradient
        colors={[theme.emeraldDeep, theme.bg, theme.navy]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.xl },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.backBtn, { borderColor: theme.border }]}
          testID="tesbihat-close"
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: fonts.display }]}>
          Namaz Sonrası Tesbihat
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepsRow}>
        {STEPS.map((s, i) => {
          const isActive = i === stepIdx;
          const isDone = i < stepIdx;
          return (
            <Animated.View
              key={s.name}
              style={[
                styles.stepDot,
                {
                  borderColor: isActive || isDone ? theme.gold : theme.border,
                  backgroundColor: isDone ? theme.gold : "transparent",
                  width: isActive ? 44 : 12,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Counter */}
      <Pressable style={styles.tapArea} onPress={onTap} testID="tesbihat-tap">
        <View style={styles.center}>
          <Text
            key={`step-${stepIdx}`}
            style={[
              styles.stepName,
              { color: theme.gold, fontFamily: fonts.display },
            ]}
          >
            {step.name}
          </Text>
          <Text style={[styles.stepArabic, { color: theme.textMuted }]}>
            {step.arabic}
          </Text>
          <View
            style={{
              width: 300,
              height: 300,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 12,
            }}
          >
            <TesbihRing
              size={300}
              beadCount={33}
              color={theme.borderStrong}
              progressColor={theme.gold}
              progress={progress}
            />
            <Animated.View style={anim}>
              <Text
                style={[styles.counter, { color: theme.text, fontFamily: fonts.display }]}
                allowFontScaling={false}
                testID="tesbihat-count"
              >
                {count}
              </Text>
            </Animated.View>
          </View>
          <Text style={[styles.progressText, { color: theme.text }]}>
            {count} / {step.target}
          </Text>
          <Text
            style={[
              styles.hint,
              { color: theme.textSubtle, marginTop: spacing.md },
            ]}
          >
            DOKUN · SIRADAKİ ZİKİR OTOMATİK BAŞLAR
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    letterSpacing: 0.3,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.lg,
  },
  stepDot: {
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
  tapArea: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: spacing.xl,
  },
  stepName: {
    fontSize: 28,
    fontWeight: "400",
    letterSpacing: 0.5,
  },
  stepArabic: {
    fontSize: 20,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  counter: {
    fontSize: 108,
    fontWeight: "300",
    letterSpacing: -1,
    textAlign: "center",
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  hint: {
    // BUG-011: textTransform "uppercase" cihaz locale'ine (en-US) bagli
    // oldugu icin Türkçe İ/ı donusumunu bozuyordu. Metin dogrudan büyük
    // harfle Türkçe olarak yazildi, transform kaldirildi.
    fontSize: 12,
    letterSpacing: 1.2,
  },
  done: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  doneBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  doneTitle: {
    fontSize: 30,
    letterSpacing: 0.5,
  },
  doneSub: {
    fontSize: 15,
  },
  ctaGhost: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    minWidth: 240,
    alignItems: "center",
  },
  ctaSolid: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.md,
    minWidth: 240,
    alignItems: "center",
    marginTop: spacing.sm,
  },
});
