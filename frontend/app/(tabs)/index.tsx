// Ana Sayfa — Zikir Sayacı.
// Tüm ekran dokunulabilir. Sayaç tap ile artar. Uzun basma yok — tek dokunuş odaklı.
//
// v1.1.0: tüm metinler i18n'e taşındı, RTL yerleşimi eklendi, sayaç
// rakamları locale'e göre biçimlendiriliyor, zikir seçicide favori/arama
// var ve "Sıfırla" onayı ayardan kapatılabiliyor.

import { Ionicons } from "@expo/vector-icons";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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
import { TesbihRing } from "@/src/components/TesbihRing";
import { useI18n } from "@/src/i18n";
import { normalizeForSearch } from "@/src/i18n/format";
import { TARGET_PRESETS, dhikrArabic, dhikrName } from "@/src/lib/dhikrs";
import { useBottomChromeHeight } from "@/src/lib/layout";
import { useDirection } from "@/src/lib/rtl";
import { useTesbihSounds } from "@/src/lib/sounds";
import { useStore } from "@/src/lib/store";
import { fonts, radius, spacing } from "@/src/lib/theme";

// BUG-007: Büyük Yazı Modu'nda 4-5 haneli sayaçlar (örn. 1044) tesbih
// halkasıyla çakışıyor ve satır kaydırabiliyordu. Basamak sayısına göre
// dinamik font boyutu — sayaç her zaman tek satırda kalır.
function getCounterFontSize(bigText: boolean, digitCount: number): number {
  const base = bigText ? 152 : 128;
  if (digitCount <= 2) return base;
  if (digitCount === 3) return Math.round(base * 0.82);
  if (digitCount === 4) return Math.round(base * 0.64);
  return Math.round(base * 0.52); // 5+ hane
}

export default function Home() {
  const {
    theme,
    activeDhikr,
    activeDhikrState,
    increment,
    undo,
    reset,
    setTargetForActive,
    updateSettings,
    state,
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
  const [controlsH, setControlsH] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1900);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const bigText = state.settings.bigText;
  const simpleMode = state.settings.simpleMode;
  const keepAwake = state.settings.keepAwake;
  const vibration = state.settings.vibration;
  const soundOn = state.settings.sound;
  const askBeforeReset = state.settings.confirmReset !== false;

  const playSound = useTesbihSounds(soundOn);

  useEffect(() => {
    const TAG = "zikirhane-home";
    if (keepAwake) {
      activateKeepAwakeAsync(TAG).catch(() => {});
      return () => {
        deactivateKeepAwake(TAG);
      };
    }
  }, [keepAwake]);

  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const triggerHaptic = (kind: "light" | "success") => {
    if (!vibration) return;
    if (kind === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const activeName = dhikrName(activeDhikr, t);

  const doTap = () => {
    const { justReachedTarget } = increment();
    triggerHaptic(justReachedTarget ? "success" : "light");
    playSound(justReachedTarget ? "target" : "tap");
    scale.value = withSequence(
      withTiming(0.94, { duration: 90 }),
      withTiming(1, { duration: 160 })
    );
    if (justReachedTarget) {
      glow.value = withSequence(
        withTiming(1, { duration: 220 }),
        withTiming(0, { duration: 700 })
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
    triggerHaptic("light");
  };

  const counterAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowAnim = useAnimatedStyle(() => ({
    opacity: glow.value * 0.8,
  }));

  const size = Math.min(screenW - 40, 360);

  const targetCount = Math.max(1, activeDhikrState.target);
  const totalCount = activeDhikrState.count;
  const completedLaps = Math.floor(totalCount / targetCount);
  const countInLap = totalCount % targetCount;
  const progress =
    totalCount > 0 && countInLap === 0 ? 1 : countInLap / targetCount;

  const counterDigits = String(activeDhikrState.count).length;
  const counterFontSize = getCounterFontSize(bigText, counterDigits);
  const anyOverlayOpen = showDhikrPicker || showTargets || confirmReset;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <LinearGradient
        colors={[theme.emeraldDeep, theme.bg, theme.navy]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ flex: 1 }}>
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.xl },
          ]}
        >
          <Text style={[styles.brandTitle, { color: theme.gold }]}>
            {t("home.brand")}
          </Text>
          <Text style={[styles.todayLine, { color: theme.textMuted }]}>
            {t("home.today", { count: todayTotal() })}
          </Text>
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
          {dhikrArabic(activeDhikr) ? (
            <Text
              style={[
                styles.arabic,
                { color: theme.textMuted, writingDirection: "rtl" },
              ]}
              numberOfLines={1}
            >
              {dhikrArabic(activeDhikr)}
            </Text>
          ) : null}
          <View style={[styles.progressRow, { flexDirection: dir.row }]}>
            <Pressable
              onPress={() => setShowTargets(true)}
              style={[styles.progressPill, { borderColor: theme.border }]}
              testID="target-selector"
              accessibilityRole="button"
              accessibilityLabel={t("home.choose_target")}
            >
              <Text style={[styles.progressText, { color: theme.text }]}>
                {fmtNumber(activeDhikrState.count)} / {fmtNumber(activeDhikrState.target)}
              </Text>
            </Pressable>
            {completedLaps > 0 ? (
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
                  {t("home.laps", { count: completedLaps })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <MultiTouchTapArea
          style={styles.tapArea}
          onTap={doTap}
          testID="counter-tap-area"
          disabled={anyOverlayOpen}
        >
          <View
            style={[
              styles.centerCol,
              { paddingBottom: bottomChrome + controlsH + spacing.md },
            ]}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={t("home.a11y_counter", {
              count: activeDhikrState.count,
              target: activeDhikrState.target,
            })}
            accessibilityHint={t("home.a11y_tap_area")}
          >
            <View
              style={{
                width: size,
                height: size,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TesbihRing
                size={size}
                beadCount={Math.min(33, activeDhikrState.target)}
                color={theme.borderStrong}
                progressColor={theme.gold}
                progress={progress}
              />
              <Animated.View
                style={[
                  styles.glowRing,
                  {
                    width: size * 0.9,
                    height: size * 0.9,
                    borderRadius: size * 0.45,
                    borderColor: theme.gold,
                    pointerEvents: "none",
                  },
                  glowAnim,
                ]}
              />
              <Animated.View style={counterAnim}>
                <Text
                  style={[
                    styles.counterText,
                    {
                      color: theme.text,
                      fontFamily: fonts.display,
                      fontSize: counterFontSize,
                    },
                  ]}
                  testID="counter-value"
                  allowFontScaling={false}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {fmtCounter(activeDhikrState.count)}
                </Text>
              </Animated.View>
            </View>
          </View>
        </MultiTouchTapArea>

        <View
          style={[
            styles.controls,
            {
              bottom: bottomChrome + spacing.md,
              paddingHorizontal: spacing.xl,
              pointerEvents: "box-none",
            },
          ]}
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            if (h > 0 && h !== controlsH) setControlsH(h);
          }}
        >
          <View style={[styles.controlsRow, { flexDirection: dir.row }]}>
            <ControlPill
              icon="arrow-undo-outline"
              label={t("home.undo")}
              onPress={() => {
                undo();
                triggerHaptic("light");
              }}
              theme={theme}
              rowDirection={dir.row}
              testID="undo-button"
            />
            <ControlPill
              icon="refresh-outline"
              label={t("home.reset")}
              onPress={() => {
                if (askBeforeReset) setConfirmReset(true);
                else doReset();
              }}
              theme={theme}
              rowDirection={dir.row}
              testID="reset-button"
            />
          </View>

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

          {!simpleMode ? (
            <View style={[styles.controlsRow, { flexDirection: dir.row }]}>
              <IconToggle
                icon={vibration ? "phone-portrait" : "phone-portrait-outline"}
                label={t("home.toggle_vibration")}
                active={vibration}
                onPress={() => {
                  const nextVal = !vibration;
                  updateSettings({ vibration: nextVal });
                  if (nextVal) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  showToast(
                    nextVal ? t("home.vibration_on") : t("home.vibration_off")
                  );
                }}
                theme={theme}
                testID="vibration-toggle"
              />
              <IconToggle
                icon={soundOn ? "volume-medium" : "volume-mute-outline"}
                label={t("home.toggle_sound")}
                active={soundOn}
                onPress={() => {
                  const nextVal = !soundOn;
                  updateSettings({ sound: nextVal });
                  triggerHaptic("light");
                  if (nextVal) playSound("tap");
                  showToast(nextVal ? t("home.sound_on") : t("home.sound_off"));
                }}
                theme={theme}
                testID="sound-toggle"
              />
              <IconToggle
                icon={keepAwake ? "sunny" : "sunny-outline"}
                label={t("home.toggle_screen")}
                active={keepAwake}
                onPress={() => {
                  const nextVal = !keepAwake;
                  updateSettings({ keepAwake: nextVal });
                  triggerHaptic("light");
                  showToast(nextVal ? t("home.screen_on") : t("home.screen_off"));
                }}
                theme={theme}
                testID="keepawake-toggle"
              />
              <IconToggle
                icon="apps-outline"
                label={t("home.tesbihat")}
                active={false}
                onPress={() => {
                  triggerHaptic("light");
                  router.push("/tesbihat");
                }}
                theme={theme}
                testID="tesbihat-shortcut"
              />
            </View>
          ) : null}
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
          current={activeDhikrState.target}
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
    </View>
  );
}

function ControlPill({
  icon,
  label,
  onPress,
  theme,
  rowDirection,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof useStore>["theme"];
  rowDirection: "row" | "row-reverse";
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          borderColor: theme.border,
          backgroundColor: theme.bgCard + "cc",
          flexDirection: rowDirection,
        },
      ]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={16} color={theme.gold} />
      <Text style={[styles.pillLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
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

// BUG-006 + BUG-009 duzeltmesi: plain View overlay yerine RN'in native
// <Modal> bileşeni kullanılıyor. Bu; (1) Android donanım Geri tuşunu
// otomatik olarak `onRequestClose` ile yakalar, (2) ayrı bir native
// pencere katmanında render olduğu için SurfaceView tabanlı reklamların
// ÜZERİNDE her zaman görünür.
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
      animationType="fade"
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
  const {
    theme,
    allDhikrs,
    state,
    setActiveDhikr,
    toggleFavoriteDhikr,
  } = useStore();
  const insets = useSafeAreaInsets();
  const { t, bcp47, n: fmtNumber } = useI18n();
  const dir = useDirection();
  const [query, setQuery] = useState("");

  // Referans kararlılığı: `|| []` her render'da YENİ dizi üretirdi ve
  // aşağıdaki useMemo boşuna yeniden çalışırdı.
  const favorites = useMemo(
    () => state.favoriteDhikrIds || [],
    [state.favoriteDhikrIds]
  );

  // Arama + favorileri üste alma. Aramada hem çevrilmiş ad hem Arapça
  // yazılış taranır; aksan/hareke normalleştirilir.
  const items = useMemo(() => {
    const q = normalizeForSearch(query, bcp47);
    const list = allDhikrs.filter((d) => {
      if (!q) return true;
      const name = normalizeForSearch(dhikrName(d, t), bcp47);
      const ar = normalizeForSearch(dhikrArabic(d) ?? "", bcp47);
      return name.includes(q) || ar.includes(q);
    });
    return [...list].sort((a, b) => {
      const fa = favorites.includes(a.id) ? 0 : 1;
      const fb = favorites.includes(b.id) ? 0 : 1;
      return fa - fb;
    });
  }, [allDhikrs, bcp47, favorites, query, t]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
              maxHeight: "78%",
              paddingBottom: 0,
            },
          ]}
        >
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
              const s = state.dhikrStates[d.id];
              const active = state.activeDhikrId === d.id;
              const fav = favorites.includes(d.id);
              const name = dhikrName(d, t);
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
                      backgroundColor: active ? theme.emeraldDeep : "transparent",
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
                      {name}
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
                    {fmtNumber(s?.count || 0)} /{" "}
                    {fmtNumber(s?.target || d.defaultTarget)}
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
  todayLine: {
    fontSize: 11,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 12,
    letterSpacing: 4,
    textAlign: "center",
    opacity: 0.85,
    marginBottom: 2,
  },
  header: {
    alignItems: "center",
    gap: spacing.sm,
  },
  dhikrPill: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: "100%",
  },
  dhikrName: {
    fontSize: 20,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  arabic: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  progressRow: {
    alignItems: "center",
    gap: spacing.sm,
  },
  lapBadge: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  lapText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  progressPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  tapArea: { flex: 1 },
  centerCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  counterText: {
    fontWeight: "300",
    letterSpacing: -2,
    textAlign: "center",
  },
  glowRing: {
    position: "absolute",
    borderWidth: 2,
  },
  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    gap: spacing.md,
  },
  controlsRow: {
    justifyContent: "center",
    gap: spacing.md,
  },
  pill: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillLabel: {
    fontSize: 13,
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  iconToggleWrap: {
    alignItems: "center",
    gap: 3,
    minWidth: 56,
  },
  iconToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  iconToggleLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  toastRow: {
    alignItems: "center",
    marginBottom: 2,
  },
  toast: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "92%",
  },
  modalOverlay: {
    justifyContent: "flex-end",
    zIndex: 20,
  },
  modalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalHint: {
    fontSize: 12,
    marginTop: spacing.sm,
  },
  searchInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
  },
  targetGrid: {
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "flex-start",
  },
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
