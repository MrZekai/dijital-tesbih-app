// Namaz Sonrası Tesbihat — 33 Sübhanallah → 33 Elhamdülillah → 33 Allahu Ekber.
// Her aşama tamamlandığında otomatik olarak sonraki zikre geçer.

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/src/components/AppText";
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
import { useTesbihSounds } from "@/src/lib/sounds";
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

/** UX-3: Yarim kalmis tesbihat en fazla bu sure kadar hatirlanir (12 saat). */
const RESUME_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export default function Tesbihat() {
  const {
    theme,
    state,
    incrementDhikrById,
    setTesbihatProgress,
    clearTesbihatProgress,
  } = useStore();
  const insets = useSafeAreaInsets();

  // UX-3: Kaldigi yerden devam. Ilk render'da kalici ilerlemeyi okuyup
  // baslangic degeri olarak kullaniriz (useState lazy initializer) —
  // boylece ekran once 0'dan basip sonra ziplamaz.
  const saved = state.tesbihatProgress;
  const resumable =
    !!saved &&
    saved.stepIdx >= 0 &&
    saved.stepIdx < STEPS.length &&
    saved.count > 0 &&
    saved.count < STEPS[saved.stepIdx].target &&
    Date.now() - saved.updatedAt < RESUME_MAX_AGE_MS;

  const [stepIdx, setStepIdx] = useState(() => (resumable ? saved!.stepIdx : 0));
  const [count, setCount] = useState(() => (resumable ? saved!.count : 0));
  const [done, setDone] = useState(false);
  // Devam edildigini kullaniciya bir kez bildirmek icin.
  const [resumedNotice, setResumedNotice] = useState(resumable);
  const showInterstitial = useRespectfulInterstitial();

  // Ses: hook kosulsuz cagrilir, calip calmayacagina icerde karar verilir.
  const playSound = useTesbihSounds(state.settings.sound);

  // DÜZELTME: "Ekranı Açık Tut" ayarı yalnızca Ana Sayfa'da işliyordu;
  // 99'luk tesbihat sırasında ekran sönüyordu. Artık burada da geçerli.
  const keepAwake = state.settings.keepAwake;
  useEffect(() => {
    const TAG = "zikirhane-tesbihat";
    if (keepAwake) {
      activateKeepAwakeAsync(TAG).catch(() => {});
      return () => {
        deactivateKeepAwake(TAG);
      };
    }
  }, [keepAwake]);

  const scale = useSharedValue(1);
  const step = STEPS[stepIdx];

  const doHaptic = (success: boolean) => {
    if (!state.settings.vibration) return;
    if (success)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // QA NEW-001 — "Namaz modu, otomatik geçişten hemen sonraki dokunuşları
  // YANLIŞ zikre yazıyor" (yarış koşulu / race condition)
  // ═══════════════════════════════════════════════════════════════════════
  //
  // KÖK NEDEN
  // ─────────
  // `onTap` içindeki `step` ve `count` değerleri RENDER CLOSURE'INDAN
  // okunuyordu. React bir state güncellemesinden sonra yeniden render edip
  // yeni bir closure üretene kadar geçen sürede (aynı kare içinde) gelen
  // dokunuşlar ESKİ closure'ı çalıştırır. Sonuç:
  //   - 33. dokunuşta Elhamdülillah'a geçilir,
  //   - ama hemen ardından gelen 34. ve 35. dokunuşlar hâlâ eski closure'da
  //     olduğu için `incrementDhikrById("subhanallah")` çağırır.
  // QA'nin ölçümü: 35 hızlı dokunuş → Sübhanallah +35 / Elhamdülillah +0
  // (beklenen +33 / +2). Toplamlar doğru, ama DAĞILIM bozuk → "En Sık
  // Yapılan Zikirler" sıralaması sistematik olarak çarpılıyordu.
  //
  // ÇÖZÜM (QA'nin önerdiği yöntem)
  // ──────────────────────────────
  // Otoriter sayaç/aşama değerleri REF'lerde tutulur. Ref'ler dokunuş
  // anında SENKRON güncellenir; React state'i yalnızca EKRANI ÇİZMEK için
  // aynalanır. Böylece her dokunuş, o anki GERÇEK aşamayı ve sayacı okur —
  // React'in render zamanlamasından tamamen bağımsız.
  //
  // NOT: Bu aynı zamanda `count + 1` closure okumasının yol açacağı SAYIM
  // KAYBINI da engeller (aynı karede iki dokunuş gelirse ikisi de aynı
  // `count` değerini okuyup tek artış üretirdi).
  const stepIdxRef = useRef(resumable ? saved!.stepIdx : 0);
  const countRef = useRef(resumable ? saved!.count : 0);
  const doneRef = useRef(false);

  const onTap = () => {
    if (doneRef.current) return;

    // ─── Commit anında GERÇEK durumu ref'ten oku (closure'dan DEĞİL) ───
    const idx = stepIdxRef.current;
    const activeStep = STEPS[idx];
    const next = countRef.current + 1;
    const reachedTarget = next >= activeStep.target;
    const isLastStep = idx >= STEPS.length - 1;

    // BUG-002: canonical istatistik/gecmis mekanizmasina dokunusu isle.
    // Artik DOGRU zikir id'sine yaziliyor.
    incrementDhikrById(activeStep.id);

    // ─── Ref'leri SENKRON ilerlet — bir sonraki dokunus guncel degeri gorur ───
    if (reachedTarget && !isLastStep) {
      stepIdxRef.current = idx + 1;
      countRef.current = 0;
    } else {
      countRef.current = next;
      if (reachedTarget && isLastStep) doneRef.current = true;
    }

    // ─── Ekrani guncelle ───
    setStepIdx(stepIdxRef.current);
    setCount(countRef.current);
    if (doneRef.current) setDone(true);

    scale.value = withSequence(
      withTiming(0.94, { duration: 80 }),
      withTiming(1, { duration: 160 })
    );

    doHaptic(reachedTarget);
    // Ana Sayfa'da olan tesbih tanesi SESI burada hic calmiyordu — eklendi.
    playSound(reachedTarget ? "target" : "tap");

    // UX-3: ilerlemeyi kalici sakla (store zaten diske debounce'lu yazar).
    if (doneRef.current) {
      clearTesbihatProgress();
    } else {
      setTesbihatProgress({
        stepIdx: stepIdxRef.current,
        count: countRef.current,
      });
    }
    if (resumedNotice) setResumedNotice(false);
  };

  /** Tesbihati bastan baslat (ref + state + kalici ilerleme birlikte). */
  const restart = () => {
    stepIdxRef.current = 0;
    countRef.current = 0;
    doneRef.current = false;
    setStepIdx(0);
    setCount(0);
    setDone(false);
    clearTesbihatProgress();
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
            onPress={restart}
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

      {/* UX-3: Kaldigi yerden devam bildirimi + bastan baslama secenegi. */}
      {resumedNotice ? (
        <View style={styles.resumeRow}>
          <View
            style={[
              styles.resumeChip,
              { borderColor: theme.gold, backgroundColor: theme.emeraldDeep },
            ]}
          >
            <Ionicons name="play-back-outline" size={14} color={theme.gold} />
            <Text style={{ color: theme.gold, fontSize: 12 }}>
              Kaldığınız yerden devam ediyorsunuz
            </Text>
            <Pressable onPress={restart} hitSlop={8} testID="tesbihat-restart-inline">
              <Text
                style={{
                  color: theme.text,
                  fontSize: 12,
                  fontWeight: "700",
                  textDecorationLine: "underline",
                }}
              >
                Baştan başla
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

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
  resumeRow: {
    alignItems: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  resumeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexWrap: "wrap",
    justifyContent: "center",
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
