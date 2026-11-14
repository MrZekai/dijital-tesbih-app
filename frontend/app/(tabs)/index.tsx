import { Ionicons } from "@expo/vector-icons";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmSheet } from "@/src/components/ConfirmSheet";
import { MultiTouchTapArea } from "@/src/components/MultiTouchTapArea";
import { useI18n } from "@/src/i18n";
import { normalizeForSearch } from "@/src/i18n/format";
import {
  TARGET_PRESETS,
  dhikrArabic,
  dhikrName,
} from "@/src/lib/dhikrs";
import { useBottomChromeHeight } from "@/src/lib/layout";
import { useDirection } from "@/src/lib/rtl";
import { useTesbihSounds } from "@/src/lib/sounds";
import { useStore } from "@/src/lib/store";
import { fonts, radius, spacing } from "@/src/lib/theme";



// BUG-007: Büyük Yazı Modu'nda 4-5 haneli sayaçlar halkayla çakışıyordu.
// Basamak sayısına göre dinamik font — sayaç her zaman tek satırda kalır.
/**
 * Sayac punto'su. Layout A: halkanin icinde SADECE sayi oldugu icin rakam
 * genis nefes alir (taban oran 0.34). Basamak arttikca kuculur, boylece
 * 5 haneli sayilar da halkanin ic capina sigar.
 */
function counterFontFor(ringSize: number, digits: number): number {
  const base = ringSize * 0.34;
  if (digits <= 2) return Math.round(base);
  if (digits === 3) return Math.round(base * 0.82);
  if (digits === 4) return Math.round(base * 0.66);
  return Math.round(base * 0.54);
}

export default function Home() {
  const {
    theme,
    loaded,
    state,
    activeDhikr,
    activeDhikrState,
    increment,
    undo,
    canUndo,
    reset,
    setTargetForActive,
    todayTotal,
  } = useStore();
  const { t, c: fmtCounter, n: fmtNumber } = useI18n();
  const dir = useDirection();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const bottomChrome = useBottomChromeHeight();

  const [confirmReset, setConfirmReset] = useState(false);
  const [showTargets, setShowTargets] = useState(false);
  const [showDhikrPicker, setShowDhikrPicker] = useState(false);
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

  useFocusEffect(useCallback(() => {
    const TAG = "zikirhane-home";
    if (s.keepAwake) {
      activateKeepAwakeAsync(TAG).catch(() => {});
      return () => {
        deactivateKeepAwake(TAG);
      };
    }
  }, [s.keepAwake]));

  const scale = useSharedValue(1);

  const haptic = (kind: "light" | "success") => {
    if (!s.vibration) return;
    if (kind === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const activeName = dhikrName(activeDhikr, t);
  const activeArabic = dhikrArabic(activeDhikr);

  const doTap = () => {
    if (!loaded || anyOverlayOpen) return;
    const { justReachedTarget } = increment();
    haptic(justReachedTarget ? "success" : "light");
    playSound(justReachedTarget ? "target" : "tap");
    scale.value = withSequence(
      withTiming(0.94, { duration: 90 }),
      withTiming(1, { duration: 160 })
    );
    if (justReachedTarget) {
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
  // ── Türetilmiş değerler ──────────────────────────────────────────────
  const target = Math.max(1, activeDhikrState.target);
  const count = activeDhikrState.count;
  const laps = Math.floor(count / target);

  const today = todayTotal();
  const goal = Math.max(1, s.dailyGoal);
  const goalPct = Math.min(100, Math.round((today / goal) * 100));
  const remaining = count > 0 && count % target === 0 ? 0 : target - (count % target);
  const ringSize = Math.min(bigText ? 300 : 244, Math.max(100, screenW - 48));
  const anyOverlayOpen = showDhikrPicker || showTargets || confirmReset;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: bottomChrome }]}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={[styles.top, { flexDirection: dir.row }]}>
          <Text style={[styles.brand, { color: theme.text }]}>{t("home.brand")}</Text>
          <Text style={[styles.mode, { color: theme.textMuted }]}>{t("home.focus")}</Text>
        </View>

        {!simpleMode && (
          <Pressable onPress={() => router.push("/(tabs)/istatistikler")} accessibilityRole="button"
            testID="home-goal-strip" style={styles.daily}>
            <Text style={{ color: theme.textMuted, textAlign: dir.textAlign }}>
              {t("stats.today")} {fmtNumber(today)} / {fmtNumber(goal)}
            </Text>
            <View style={[styles.track, { backgroundColor: theme.border, alignItems: dir.row === "row-reverse" ? "flex-end" : "flex-start" }]}>
              <View style={{ height: 4, width: `${goalPct}%`, backgroundColor: theme.gold }} />
            </View>
          </Pressable>
        )}

        <Pressable onPress={() => setShowDhikrPicker(true)} testID="active-dhikr-selector"
          accessibilityRole="button" accessibilityLabel={t("home.choose_dhikr")}
          style={[styles.selector, { flexDirection: dir.row }]}>
          <Text numberOfLines={2} style={[styles.name, { color: theme.text }]}>{activeName}</Text>
          <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
        </Pressable>
        {!!activeArabic && <Text style={[styles.arabic, { color: theme.gold }]}>{activeArabic}</Text>}

        <View style={styles.heroBox}>
          <MultiTouchTapArea onTap={doTap} testID="counter-tap-area" disabled={!loaded || anyOverlayOpen}
            style={[styles.circle, { width: ringSize, height: ringSize, borderRadius: ringSize / 2,
              backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <View accessible accessibilityRole="adjustable"
              accessibilityLabel={t("home.a11y_counter", { count, target })}
              accessibilityHint={t("home.tap_hint")}
              accessibilityActions={[{ name: "activate" }, { name: "increment" }, { name: "decrement" }]}
              onAccessibilityAction={({ nativeEvent }) => {
                if (!loaded || anyOverlayOpen) return;
                if (nativeEvent.actionName === "decrement") undo();
                else if (nativeEvent.actionName === "activate" || nativeEvent.actionName === "increment") doTap();
              }} style={styles.centerStack}>
              <Animated.View style={counterAnim}>
                <Text testID="counter-value" allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit
                  style={[styles.counterText, { color: theme.text, fontSize: counterFontFor(ringSize, String(count).length) }]}>
                  {fmtCounter(count)}
                </Text>
              </Animated.View>
              <Text style={[styles.hint, { color: theme.textMuted }]}>{t("home.tap_hint")}</Text>
            </View>
          </MultiTouchTapArea>
        </View>

        <Pressable testID="target-selector" onPress={() => setShowTargets(true)} accessibilityRole="button"
          accessibilityHint={t("home.choose_target")} style={styles.metaRow}>
          <Text style={{ color: theme.textMuted, textAlign: "center" }}>
            {t("custom.target_label")} {fmtNumber(target)} · {t("stats.remaining", { count: remaining })}
          </Text>
          {laps > 0 && !simpleMode && <Text testID="lap-badge" style={{ color: theme.gold }}>{t("home.laps", { count: laps })}</Text>}
        </Pressable>
        <View style={[styles.actionRow, { flexDirection: dir.row }]}>
          <Pressable testID="undo-button" accessibilityRole="button" disabled={!canUndo}
            accessibilityState={{ disabled: !canUndo }} onPress={() => { if (undo()) haptic("light"); }}
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: theme.bgCard, borderColor: theme.border, opacity: pressed || !canUndo ? 0.55 : 1 }]}>
            <Text style={{ color: theme.text }}>{t("home.undo")}</Text>
          </Pressable>
          <Pressable testID="reset-button" accessibilityRole="button"
            onPress={() => { if (askBeforeReset) setConfirmReset(true); else doReset(); }}
            style={({ pressed }) => [styles.actionBtn, { borderColor: "transparent", opacity: pressed ? 0.55 : 1 }]}>
            <Text style={{ color: theme.textMuted }}>{t("home.reset")}</Text>
          </Pressable>
        </View>
        <Text accessibilityLiveRegion="polite" testID="home-toast" style={[styles.feedback, { color: theme.gold }]}>{toast ?? " "}</Text>
      </ScrollView>

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
    const recents = state.recentDhikrIds ?? [];
    const rank = (id: string) => {
      if (favorites.includes(id)) return -1;
      const index = recents.indexOf(id);
      return index < 0 ? recents.length : index;
    };
    return list.sort((a, b) => rank(a.id) - rank(b.id));
  }, [allDhikrs, bcp47, favorites, query, state.recentDhikrIds, t]);

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

  page: { flexGrow: 1, width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  top: { alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  brand: { fontSize: 24, fontFamily: fonts.display },
  mode: { fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase" },
  daily: { marginTop: spacing.md, minHeight: 44, justifyContent: "center", gap: 8 },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  selector: { alignSelf: "center", minHeight: 44, marginTop: spacing.sm, alignItems: "center", gap: 8, maxWidth: "95%" },
  name: { fontSize: 18, fontWeight: "600", flexShrink: 1, textAlign: "center" },
  arabic: { fontSize: 27, textAlign: "center", writingDirection: "rtl" },
  heroBox: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.lg },
  circle: { borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  centerStack: { width: "100%", alignItems: "center", justifyContent: "center" },
  counterText: { fontWeight: "300", fontVariant: ["tabular-nums"], textAlign: "center", includeFontPadding: false },
  hint: { fontSize: 12, letterSpacing: 0.6, textAlign: "center", marginTop: spacing.xs },
  metaRow: { minHeight: 44, alignItems: "center", justifyContent: "center", gap: 2 },
  actionRow: { justifyContent: "center", flexWrap: "wrap", gap: spacing.md },
  actionBtn: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  feedback: { minHeight: 23, marginTop: spacing.sm, fontSize: 13, textAlign: "center" },

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
