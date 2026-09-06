// Ana Sayfa — Zikir Panosu (v1.1.0 yeniden tasarım).
//
// TASARIM HEDEFİ
// ──────────────
// 1.0.21'deki ekran yalnızca "büyük sayaç + iki düğme" idi. Bu sürümde
// sayaç HÂLÂ ekranın kahramanı; ama etrafına gerçekten kullanılan bilgi
// ve kısayollar eklendi:
//
//   ┌────────────────────────────────────────────┐
//   │ [logo] ZİKİRMATİK              [ 7 gün ]   │  marka + seri
//   │ ──────────────────────────────────────────  │
//   │ Bugün 128 · günlük hedefin %128'i          │  ilerleme şeridi
//   │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░                   │
//   │                                            │
//   │            ( Sübhanallah ▾ )               │  aktif zikir
//   │              سُبْحَانَ ٱللَّٰهِ                     │
//   │                                            │
//   │              ╭───────────╮                 │
//   │              │    33     │  ← KAHRAMAN     │  sayaç halkası
//   │              ╰───────────╯                 │
//   │               33/33 · 2 tur                │
//   │                                            │
//   │  ★Salavat  ★Estağfirullah  Kelime-i…  →   │  hızlı geçiş
//   │  [Geri Al]  [Sıfırla]                      │
//   │  Titreşim  Ses  Ekran  Tesbihat            │
//   └────────────────────────────────────────────┘
//
// Korunanlar: çoklu parmak sayımı (`MultiTouchTapArea`), ekranı açık tutma,
// ses/titreşim, sıfırlama onayı, hedef ve zikir seçici, reklam alanının
// üstünde güvenli boşluk, RTL, Büyük Yazı Modu, Sade Mod.

import { Ionicons } from "@expo/vector-icons";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { Text, TextInput } from "@/src/components/AppText";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmSheet } from "@/src/components/ConfirmSheet";
import { MultiTouchTapArea } from "@/src/components/MultiTouchTapArea";
import { TesbihRingSvg } from "@/src/components/TesbihRingSvg";
import { useI18n } from "@/src/i18n";
import { normalizeForSearch } from "@/src/i18n/format";
import {
  TARGET_PRESETS,
  dhikrArabic,
  dhikrName,
  type AnyDhikr,
} from "@/src/lib/dhikrs";
import { useBottomChromeHeight } from "@/src/lib/layout";
import { useDirection } from "@/src/lib/rtl";
import { useTesbihSounds } from "@/src/lib/sounds";
import { useStore } from "@/src/lib/store";
import { fonts, radius, spacing } from "@/src/lib/theme";

const BRAND_MARK = require("@/assets/images/icon.png");

// BUG-007: Büyük Yazı Modu'nda 4-5 haneli sayaçlar halkayla çakışıyordu.
// Basamak sayısına göre dinamik font — sayaç her zaman tek satırda kalır.
/**
 * Sayac punto'su. v1.1.0-r2: rakam artik halkanin ICINDE ve hemen altinda
 * hedef/tur satiri var; bu yuzden taban oran 0.38 -> 0.30'a cekildi.
 * Boylece 5 haneli sayilarda bile merkez yigini halkayi tasirmaz.
 */
function counterFontFor(ringSize: number, digits: number): number {
  const base = ringSize * 0.3;
  if (digits <= 2) return Math.round(base);
  if (digits === 3) return Math.round(base * 0.84);
  if (digits === 4) return Math.round(base * 0.68);
  return Math.round(base * 0.56);
}

export default function Home() {
  const {
    theme,
    state,
    allDhikrs,
    activeDhikr,
    activeDhikrState,
    increment,
    undo,
    reset,
    setActiveDhikr,
    setTargetForActive,
    updateSettings,
    todayTotal,
    streak,
  } = useStore();
  const { t, c: fmtCounter, n: fmtNumber } = useI18n();
  const dir = useDirection();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const bottomChrome = useBottomChromeHeight();

  const [confirmReset, setConfirmReset] = useState(false);
  const [showTargets, setShowTargets] = useState(false);
  const [showDhikrPicker, setShowDhikrPicker] = useState(false);
  const [controlsH, setControlsH] = useState(0);
  const [headerH, setHeaderH] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2100);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const s = state.settings;
  const bigText = s.bigText;
  const simpleMode = s.simpleMode;
  const askBeforeReset = s.confirmReset !== false;

  const playSound = useTesbihSounds({
    tap: s.soundTap,
    complete: s.soundComplete,
  });

  useEffect(() => {
    const TAG = "zikirhane-home";
    if (s.keepAwake) {
      activateKeepAwakeAsync(TAG).catch(() => {});
      return () => {
        deactivateKeepAwake(TAG);
      };
    }
  }, [s.keepAwake]);

  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const haptic = (kind: "light" | "success") => {
    if (!s.vibration) return;
    if (kind === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const activeName = dhikrName(activeDhikr, t);
  const activeArabic = dhikrArabic(activeDhikr);

  const doTap = () => {
    const { justReachedTarget } = increment();
    haptic(justReachedTarget ? "success" : "light");
    playSound(justReachedTarget ? "target" : "tap");
    scale.value = withSequence(
      withTiming(0.94, { duration: 90 }),
      withTiming(1, { duration: 160 })
    );
    if (justReachedTarget) {
      glow.value = withSequence(
        withTiming(1, { duration: 240 }),
        withTiming(0, { duration: 900 })
      );
      showToast(
        t("home.target_reached", {
          count: activeDhikrState.target,
          name: activeName,
        })
      );
    }
  };

  const doReset = () => {
    reset();
    haptic("light");
  };

  const counterAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  // Hedef tamamlandığında ~900 ms süren ÖLÇÜLÜ kutlama:
  // altın halka nefes alır, arkasında yumuşak bir hale büyüyüp söner.
  // Abartılı konfeti/tam ekran efekt YOK — ibadet ekranı sakin kalmalı.
  const glowAnim = useAnimatedStyle(() => ({
    opacity: glow.value * 0.9,
    transform: [{ scale: 0.94 + glow.value * 0.1 }],
  }));
  const haloAnim = useAnimatedStyle(() => ({
    opacity: glow.value * 0.32,
    transform: [{ scale: 0.8 + glow.value * 0.45 }],
  }));

  // ── Türetilmiş değerler ──────────────────────────────────────────────
  const target = Math.max(1, activeDhikrState.target);
  const count = activeDhikrState.count;
  const laps = Math.floor(count / target);
  const inLap = count % target;
  const progress = count > 0 && inLap === 0 ? 1 : inLap / target;

  const today = todayTotal();
  const goal = Math.max(1, s.dailyGoal);
  const goalPct = Math.min(100, Math.round((today / goal) * 100));
  const { current: streakDays } = streak();

  // Hızlı geçiş şeridi: önce favoriler, sonra son kullanılanlar.
  const quickItems = useMemo(() => {
    const favs = state.favoriteDhikrIds || [];
    const recents = state.recentDhikrIds || [];
    const ids: string[] = [];
    for (const id of [...favs, ...recents]) {
      if (!ids.includes(id)) ids.push(id);
    }
    return ids
      .map((id) => allDhikrs.find((d) => d.id === id))
      .filter((d): d is AnyDhikr => !!d)
      .slice(0, 8);
  }, [allDhikrs, state.favoriteDhikrIds, state.recentDhikrIds]);

  // Halka boyutu: hem genişliğe hem KALAN YÜKSEKLİĞE göre — küçük
  // ekranlarda kontrollerle çakışmaz.
  const availableH = Math.max(
    190,
    screenH - insets.top - headerH - controlsH - bottomChrome - 62
  );
  // v1.1.0: halka belirgin biçimde büyütüldü (350 → 420) ve yatay pay
  // 56 → 28'e indirildi. Yükseklik kısıtı yine geçerli: küçük ekranlarda
  // kontrollerin üstüne binmez.
  // v1.1.0-r2: sayac/hedef/tur halkanin ICINE alindi ve Geri Al/Sifirla
  // satiri kaldirildi. Bosalan ~90dp halkaya verildi: ust sinir 420 -> 460.
  const ringSize = Math.max(
    180,
    Math.min(screenW - 24, availableH, bigText ? 400 : 460)
  );

  // Hiç zikir çekilmemişse ana sayfa boş hissettirmesin.
  const isFirstUse = state.totalCount === 0 && quickItems.length === 0;

  const anyOverlayOpen = showDhikrPicker || showTargets || confirmReset;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <LinearGradient
        colors={[theme.emeraldDeep, theme.bg, theme.navy]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.55, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── ÜST BLOK: marka · seri · günlük ilerleme · aktif zikir ── */}
      <View
        style={{ paddingTop: insets.top + spacing.sm }}
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          if (h > 0 && h !== headerH) setHeaderH(h);
        }}
      >
        <View
          style={[
            styles.brandRow,
            { flexDirection: dir.row, paddingHorizontal: spacing.xl },
          ]}
        >
          <Image
            source={BRAND_MARK}
            style={styles.brandMark}
            accessibilityIgnoresInvertColors
          />
          <Text
            style={[styles.brandTitle, { color: theme.gold }]}
            numberOfLines={1}
          >
            {t("home.brand")}
          </Text>
          <View style={{ flex: 1 }} />
          {streakDays > 0 ? (
            <Animated.View
              entering={FadeIn.duration(400)}
              style={[
                styles.streakPill,
                {
                  borderColor: theme.gold,
                  backgroundColor: theme.emeraldDeep,
                  flexDirection: dir.row,
                },
              ]}
              testID="home-streak"
            >
              <Ionicons name="flame-outline" size={13} color={theme.gold} />
              <Text style={[styles.streakText, { color: theme.gold }]}>
                {t("stats.days", { count: streakDays })}
              </Text>
            </Animated.View>
          ) : null}
        </View>

        {/* Günlük hedef ilerleme şeridi */}
        <Pressable
          onPress={() => router.push("/(tabs)/istatistikler")}
          style={[styles.goalStrip, { paddingHorizontal: spacing.xl }]}
          testID="home-goal-strip"
          accessibilityRole="button"
          accessibilityLabel={
            goalPct >= 100
              ? t("stats.goal_reached")
              : t("stats.remaining", { count: Math.max(0, goal - today) })
          }
        >
          <View style={[styles.goalLine, { flexDirection: dir.row }]}>
            <Text style={[styles.goalToday, { color: theme.text }]}>
              {t("home.today", { count: today })}
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.goalPct, { color: theme.textMuted }]}>
              {goalPct >= 100
                ? t("stats.goal_reached")
                : t("stats.goal_progress", { percent: goalPct })}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: theme.divider }]}>
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: goalPct >= 100 ? theme.success : theme.gold,
                  width: `${goalPct}%`,
                },
              ]}
            />
          </View>
        </Pressable>

        {/* Aktif zikir */}
        <View style={styles.activeBlock}>
          <Pressable
            onPress={() => setShowDhikrPicker(true)}
            style={[
              styles.dhikrPill,
              {
                borderColor: theme.gold,
                backgroundColor: theme.emeraldDeep,
                flexDirection: dir.row,
              },
            ]}
            testID="active-dhikr-selector"
            accessibilityRole="button"
            accessibilityLabel={t("home.choose_dhikr")}
          >
            <Text
              style={[
                styles.dhikrName,
                { color: theme.gold, fontFamily: fonts.display },
              ]}
              numberOfLines={1}
            >
              {activeName}
            </Text>
            <Ionicons name="chevron-down" size={14} color={theme.gold} />
          </Pressable>
          {activeArabic ? (
            <Text
              style={[
                styles.arabic,
                { color: theme.textMuted, writingDirection: "rtl" },
              ]}
              numberOfLines={1}
            >
              {activeArabic}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ── KAHRAMAN: sayaç ── */}
      <MultiTouchTapArea
        style={styles.tapArea}
        onTap={doTap}
        testID="counter-tap-area"
        disabled={anyOverlayOpen}
      >
        <View
          style={[
            styles.centerCol,
            { paddingBottom: bottomChrome + controlsH + spacing.sm },
          ]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t("home.a11y_counter", { count, target })}
          accessibilityHint={t("home.a11y_tap_area")}
        >
          <View
            style={{
              width: ringSize,
              height: ringSize,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TesbihRingSvg
              size={ringSize}
              beadCount={Math.min(33, target)}
              color={theme.borderStrong}
              progressColor={theme.gold}
              motifColor={theme.gold}
              progress={progress}
              reduceMotion={s.simpleMode}
            />
            <Animated.View
              style={[
                styles.halo,
                {
                  width: ringSize,
                  height: ringSize,
                  borderRadius: ringSize / 2,
                  backgroundColor: theme.gold,
                  pointerEvents: "none",
                },
                haloAnim,
              ]}
            />
            <Animated.View
              style={[
                styles.glowRing,
                {
                  width: ringSize * 0.9,
                  height: ringSize * 0.9,
                  borderRadius: ringSize * 0.45,
                  borderColor: theme.gold,
                  pointerEvents: "none",
                },
                glowAnim,
              ]}
            />
            {/* MERKEZ YIGINI — sayi, hedef ve tur bilgisi halkanin ICINDE.
                Mutlak konumlandirma sart: normal akista SVG'den sonra gelir,
                halka kutusunun disina tasar ve alttaki satirlarin uzerine
                biner (v1.1.0 QA'sinda bu hata yasandi). Yigin tek parca
                oldugu icin rakam ile hedef hapi ARTIK CAKISAMAZ. */}
            <View style={styles.centerStack} pointerEvents="box-none">
            <Animated.View style={counterAnim} pointerEvents="none">
              <Text
                style={[
                  styles.counterText,
                  {
                    color: theme.text,
                    fontFamily: fonts.display,
                    fontSize: counterFontFor(ringSize, String(count).length),
                  },
                ]}
                testID="counter-value"
                allowFontScaling={false}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {fmtCounter(count)}
              </Text>
            </Animated.View>

            {/* Hedef · tur bilgisi — sayinin hemen altinda, halkanin icinde */}
            <View style={[styles.metaRow, { flexDirection: dir.row }]}>
            <Pressable
              onPress={() => setShowTargets(true)}
              style={[styles.metaPill, { borderColor: theme.border }]}
              testID="target-selector"
              accessibilityRole="button"
              accessibilityLabel={t("home.choose_target")}
            >
              <Text style={[styles.metaText, { color: theme.text }]}>
                {fmtNumber(count)} / {fmtNumber(target)}
              </Text>
            </Pressable>
            {laps > 0 ? (
              <View
                style={[
                  styles.lapBadge,
                  {
                    borderColor: theme.gold,
                    backgroundColor: theme.emeraldDeep,
                    flexDirection: dir.row,
                  },
                ]}
                testID="lap-badge"
              >
                <Ionicons name="checkmark-circle" size={12} color={theme.gold} />
                <Text style={[styles.lapText, { color: theme.gold }]}>
                  {t("home.laps", { count: laps })}
                </Text>
              </View>
            ) : null}
            </View>
            </View>
          </View>
        </View>
      </MultiTouchTapArea>

      {/* ── ALT BLOK: hızlı geçiş · kontroller ── */}
      <View
        style={[
          styles.controls,
          {
            bottom: bottomChrome + spacing.md,
            pointerEvents: "box-none",
          },
        ]}
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          if (h > 0 && h !== controlsH) setControlsH(h);
        }}
      >
        {/* İlk kullanım: hiç sayım yoksa tek bir yönlendirme kartı.
            Kullanıcı ilk açılışta boş bir ekranla karşılaşmasın. */}
        {isFirstUse ? (
          <Animated.View entering={FadeIn.duration(500)} style={styles.startWrap}>
            <Pressable
              onPress={() => {
                haptic("light");
                router.push("/tesbihat");
              }}
              style={[
                styles.startCard,
                {
                  borderColor: theme.gold,
                  backgroundColor: theme.emeraldDeep,
                  flexDirection: dir.row,
                },
              ]}
              testID="home-first-use-card"
              accessibilityRole="button"
              accessibilityLabel={t("tesbihat.title")}
            >
              <Ionicons name="moon-outline" size={18} color={theme.gold} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.gold,
                    fontSize: 13,
                    fontWeight: "700",
                    textAlign: dir.textAlign,
                  }}
                  numberOfLines={1}
                >
                  {t("tesbihat.title")}
                </Text>
                <Text
                  style={{
                    color: theme.textMuted,
                    fontSize: 11,
                    marginTop: 1,
                    textAlign: dir.textAlign,
                  }}
                  numberOfLines={1}
                >
                  {t("tesbihat.subtitle")}
                </Text>
              </View>
              <Ionicons name={dir.forwardIcon} size={16} color={theme.gold} />
            </Pressable>
          </Animated.View>
        ) : null}

        {/* Hızlı zikir geçişi — favoriler + son kullanılanlar */}
        {!simpleMode && quickItems.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.quickRow,
              { flexDirection: dir.row, paddingHorizontal: spacing.xl },
            ]}
            testID="home-quick-switch"
          >
            {quickItems.map((d) => {
              const on = d.id === activeDhikr.id;
              const fav = (state.favoriteDhikrIds || []).includes(d.id);
              return (
                <Pressable
                  key={d.id}
                  onPress={() => {
                    setActiveDhikr(d.id);
                    haptic("light");
                  }}
                  style={[
                    styles.quickChip,
                    {
                      borderColor: on ? theme.gold : theme.border,
                      backgroundColor: on
                        ? theme.emeraldDeep
                        : theme.bgCard + "cc",
                      flexDirection: dir.row,
                    },
                  ]}
                  testID={`quick-${d.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  {fav ? (
                    <Ionicons name="star" size={11} color={theme.gold} />
                  ) : null}
                  <Text
                    style={{
                      color: on ? theme.gold : theme.textMuted,
                      fontSize: 12,
                      fontWeight: on ? "700" : "500",
                    }}
                    numberOfLines={1}
                  >
                    {dhikrName(d, t)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Bilgi baloncuğu — alan HER ZAMAN ayrılır (düzen zıplamaz). */}
        <View
          style={[styles.toastRow, { opacity: toast ? 1 : 0 }]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.toast,
              { backgroundColor: theme.bgCard, borderColor: theme.gold },
            ]}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 13,
                textAlign: "center",
                writingDirection: dir.writingDirection,
              }}
              testID="home-toast"
              numberOfLines={1}
            >
              {toast ?? " "}
            </Text>
          </View>
        </View>

        {/* TEK kontrol satiri: Geri Al · Sifirla + ayar dugmeleri.
            v1.1.0-r2: eskiden Geri Al/Sifirla AYRI bir satirdaydi; bu satir
            kaldirilarak ~60dp kazanildi ve halka o kadar buyudu. */}
        <View style={[styles.controlsRow, { flexDirection: dir.row }]}>
          <IconToggle
            icon="arrow-undo-outline"
            label={t("home.undo")}
            active={false}
            onPress={() => {
              undo();
              haptic("light");
            }}
            theme={theme}
            testID="undo-button"
          />
          <IconToggle
            icon="refresh-outline"
            label={t("home.reset")}
            active={false}
            onPress={() => {
              if (askBeforeReset) setConfirmReset(true);
              else doReset();
            }}
            theme={theme}
            testID="reset-button"
          />
          {!simpleMode ? (
            <>
            <IconToggle
              icon={s.vibration ? "phone-portrait" : "phone-portrait-outline"}
              label={t("home.toggle_vibration")}
              active={s.vibration}
              onPress={() => {
                const v = !s.vibration;
                updateSettings({ vibration: v });
                if (v) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                showToast(v ? t("home.vibration_on") : t("home.vibration_off"));
              }}
              theme={theme}
              testID="vibration-toggle"
            />
            <IconToggle
              icon={s.soundComplete ? "volume-medium" : "volume-mute-outline"}
              label={t("home.toggle_sound")}
              active={s.soundComplete}
              onPress={() => {
                // Ana sayfadaki hızlı düğme TAMAMLANMA sesini yönetir;
                // her dokunuştaki tane sesi Ayarlar'dan açılır.
                const v = !s.soundComplete;
                updateSettings({ soundComplete: v });
                haptic("light");
                if (v) playSound("target");
                showToast(v ? t("home.sound_on") : t("home.sound_off"));
              }}
              theme={theme}
              testID="sound-toggle"
            />
            <IconToggle
              icon={s.keepAwake ? "sunny" : "sunny-outline"}
              label={t("home.toggle_screen")}
              active={s.keepAwake}
              onPress={() => {
                const v = !s.keepAwake;
                updateSettings({ keepAwake: v });
                haptic("light");
                showToast(v ? t("home.screen_on") : t("home.screen_off"));
              }}
              theme={theme}
              testID="keepawake-toggle"
            />
            <IconToggle
              icon="apps-outline"
              label={t("home.tesbihat")}
              active={false}
              onPress={() => {
                haptic("light");
                router.push("/tesbihat");
              }}
              theme={theme}
              testID="tesbihat-shortcut"
            />
            </>
          ) : null}
        </View>
      </View>

      <ConfirmSheet
        visible={confirmReset}
        title={t("home.reset_title")}
        message={t("home.reset_message", { name: activeName })}
        confirmLabel={t("home.reset")}
        destructive
        onConfirm={() => {
          setConfirmReset(false);
          doReset();
        }}
        onCancel={() => setConfirmReset(false)}
        theme={theme}
        testID="reset-confirm"
      />

      <TargetPickerSheet
        visible={showTargets}
        current={target}
        onPick={(n) => {
          setTargetForActive(n);
          setShowTargets(false);
        }}
        onClose={() => setShowTargets(false)}
        theme={theme}
      />

      <DhikrPickerSheet
        visible={showDhikrPicker}
        onClose={() => setShowDhikrPicker(false)}
      />
    </View>
  );
}

function IconToggle({
  icon,
  label,
  active,
  onPress,
  theme,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useStore>["theme"];
  testID: string;
}) {
  return (
    <View style={styles.iconToggleWrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.iconToggle,
          {
            borderColor: active ? theme.gold : theme.border,
            borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
            backgroundColor: active ? theme.emeraldDeep : theme.bgCard + "cc",
            opacity: pressed ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
        hitSlop={6}
      >
        <Ionicons
          name={icon}
          size={18}
          color={active ? theme.gold : theme.textSubtle}
        />
      </Pressable>
      <Text
        style={[
          styles.iconToggleLabel,
          { color: active ? theme.gold : theme.textSubtle },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// Native <Modal>: Android geri tuşunu `onRequestClose` ile yakalar ve ayrı
// bir pencere katmanında render olduğu için reklam view'larının üstünde kalır.
function TargetPickerSheet({
  visible,
  current,
  onPick,
  onClose,
  theme,
}: {
  visible: boolean;
  current: number;
  onPick: (n: number) => void;
  onClose: () => void;
  theme: ReturnType<typeof useStore>["theme"];
}) {
  const insets = useSafeAreaInsets();
  const { t, n: fmtNumber } = useI18n();
  const dir = useDirection();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          StyleSheet.absoluteFillObject,
          styles.modalOverlay,
          { backgroundColor: theme.overlay },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <Text
            style={[
              styles.modalTitle,
              { color: theme.text, textAlign: dir.textAlign },
            ]}
          >
            {t("home.choose_target")}
          </Text>
          <View style={[styles.targetGrid, { flexDirection: dir.row }]}>
            {TARGET_PRESETS.map((n) => (
              <Pressable
                key={n}
                onPress={() => onPick(n)}
                style={[
                  styles.targetChip,
                  {
                    borderColor: n === current ? theme.gold : theme.border,
                    backgroundColor:
                      n === current ? theme.emeraldDeep : "transparent",
                  },
                ]}
                testID={`target-${n}`}
                accessibilityRole="button"
                accessibilityState={{ selected: n === current }}
              >
                <Text
                  style={{
                    color: n === current ? theme.gold : theme.text,
                    fontSize: 18,
                    fontWeight: "600",
                  }}
                >
                  {fmtNumber(n)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text
            style={[
              styles.modalHint,
              { color: theme.textSubtle, textAlign: dir.textAlign },
            ]}
          >
            {t("home.custom_target_hint")}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function DhikrPickerSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { theme, allDhikrs, state, setActiveDhikr, toggleFavoriteDhikr } =
    useStore();
  const insets = useSafeAreaInsets();
  const { t, bcp47, n: fmtNumber } = useI18n();
  const dir = useDirection();
  const [query, setQuery] = useState("");

  const favorites = useMemo(
    () => state.favoriteDhikrIds || [],
    [state.favoriteDhikrIds]
  );

  const items = useMemo(() => {
    const q = normalizeForSearch(query, bcp47);
    const list = allDhikrs.filter((d) => {
      if (!q) return true;
      const name = normalizeForSearch(dhikrName(d, t), bcp47);
      const ar = normalizeForSearch(dhikrArabic(d) ?? "", bcp47);
      return name.includes(q) || ar.includes(q);
    });
    return [...list].sort(
      (a, b) =>
        (favorites.includes(a.id) ? 0 : 1) - (favorites.includes(b.id) ? 0 : 1)
    );
  }, [allDhikrs, bcp47, favorites, query, t]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          StyleSheet.absoluteFillObject,
          styles.modalOverlay,
          { backgroundColor: theme.overlay },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
              maxHeight: "80%",
              paddingBottom: 0,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <Text
            style={[
              styles.modalTitle,
              { color: theme.text, textAlign: dir.textAlign },
            ]}
          >
            {t("home.choose_dhikr")}
          </Text>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("mydhikrs.search_placeholder")}
            placeholderTextColor={theme.textSubtle}
            style={[
              styles.searchInput,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.bg,
                textAlign: dir.textAlign,
                writingDirection: dir.writingDirection,
              },
            ]}
            testID="dhikr-picker-search"
            accessibilityLabel={t("mydhikrs.search_placeholder")}
          />

          <ScrollView
            style={{ marginTop: 4 }}
            contentContainerStyle={{
              gap: 8,
              paddingBottom: insets.bottom + spacing.lg,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            testID="dhikr-picker-scroll"
          >
            {items.length === 0 ? (
              <Text
                style={{
                  color: theme.textSubtle,
                  fontSize: 14,
                  paddingVertical: spacing.lg,
                  textAlign: dir.textAlign,
                }}
              >
                {t("mydhikrs.no_results")}
              </Text>
            ) : null}
            {items.map((d) => {
              const st = state.dhikrStates[d.id];
              const active = state.activeDhikrId === d.id;
              const fav = favorites.includes(d.id);
              const ar = dhikrArabic(d);
              return (
                <Pressable
                  key={d.id}
                  onPress={() => {
                    setActiveDhikr(d.id);
                    onClose();
                  }}
                  style={[
                    styles.dhikrRow,
                    {
                      borderColor: active ? theme.gold : theme.border,
                      backgroundColor: active
                        ? theme.emeraldDeep
                        : "transparent",
                      flexDirection: dir.row,
                    },
                  ]}
                  testID={`dhikr-pick-${d.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Pressable
                    onPress={() => toggleFavoriteDhikr(d.id)}
                    hitSlop={10}
                    testID={`dhikr-fav-${d.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={
                      fav
                        ? t("mydhikrs.remove_favorite")
                        : t("mydhikrs.add_favorite")
                    }
                  >
                    <Ionicons
                      name={fav ? "star" : "star-outline"}
                      size={18}
                      color={fav ? theme.gold : theme.textSubtle}
                    />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 16,
                        fontWeight: "600",
                        textAlign: dir.textAlign,
                      }}
                    >
                      {dhikrName(d, t)}
                    </Text>
                    {ar ? (
                      <Text
                        style={{
                          color: theme.textMuted,
                          fontSize: 14,
                          marginTop: 2,
                          textAlign: dir.textAlign,
                          writingDirection: "rtl",
                        }}
                      >
                        {ar}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: theme.gold, fontSize: 14 }}>
                    {fmtNumber(st?.count || 0)} /{" "}
                    {fmtNumber(st?.target || d.defaultTarget)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  brandRow: { alignItems: "center", gap: 8 },
  brandMark: { width: 22, height: 22, borderRadius: 6 },
  brandTitle: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: "600",
    opacity: 0.9,
    flexShrink: 1,
  },
  streakPill: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  streakText: { fontSize: 11, fontWeight: "700" },

  goalStrip: { marginTop: spacing.md, gap: 6 },
  goalLine: { alignItems: "center", gap: 8 },
  goalToday: { fontSize: 13, fontWeight: "600" },
  goalPct: { fontSize: 11 },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },

  activeBlock: { alignItems: "center", gap: 6, marginTop: spacing.lg },
  dhikrPill: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: "92%",
  },
  dhikrName: { fontSize: 20, letterSpacing: 0.5, flexShrink: 1 },
  arabic: { fontSize: 15, letterSpacing: 0.5 },

  tapArea: { flex: 1 },
  centerCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  counterText: { fontWeight: "300", letterSpacing: -2, textAlign: "center" },
  // Sayi + hedef + tur — halkanin merkezinde TEK parca yigin.
  // Mutlak kaplama: normal akista SVG'nin altina duser ve tasar.
  centerStack: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: "12%",
  },
  glowRing: { position: "absolute", borderWidth: 2 },
  halo: { position: "absolute" },

  metaRow: { alignItems: "center", gap: spacing.sm },
  metaPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaText: { fontSize: 14, fontWeight: "600", letterSpacing: 0.5 },
  lapBadge: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lapText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },

  controls: { position: "absolute", left: 0, right: 0, gap: spacing.sm },
  quickRow: { alignItems: "center", gap: 8, paddingBottom: 2 },
  startWrap: { paddingHorizontal: spacing.xl },
  startCard: {
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  quickChip: {
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 160,
  },
  // 6 dugme tek satirda: 6x48 + 5x6 = 318dp, en dar telefonda bile sigar.
  controlsRow: {
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  pill: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillLabel: { fontSize: 13, letterSpacing: 0.5, fontWeight: "600" },
  iconToggleWrap: { alignItems: "center", gap: 3, width: 48 },
  iconToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  iconToggleLabel: { fontSize: 10, letterSpacing: 0.2, textAlign: "center" },

  toastRow: { alignItems: "center", marginBottom: 2 },
  toast: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "92%",
  },

  modalOverlay: { justifyContent: "flex-end", zIndex: 20 },
  modalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    gap: spacing.md,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: -spacing.sm,
    marginBottom: spacing.xs,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalHint: { fontSize: 12, marginTop: spacing.sm },
  searchInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
  },
  targetGrid: { flexWrap: "wrap", gap: 12, justifyContent: "flex-start" },
  targetChip: {
    minWidth: 80,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: "center",
  },
  dhikrRow: {
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
});
