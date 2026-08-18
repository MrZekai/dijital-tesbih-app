// Ana Sayfa — Zikir Sayacı.
// Tüm ekran dokunulabilir. Sayaç tap ile artar. Uzun basma yok — tek dokunuş odaklı.

import { Ionicons } from "@expo/vector-icons";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { Text } from "@/src/components/AppText";
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
import { TARGET_PRESETS } from "@/src/lib/dhikrs";
import { useBottomChromeHeight } from "@/src/lib/layout";
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
  const insets = useSafeAreaInsets();
  // Dimensions.get() modül yüklenirken BİR KEZ okunuyordu; katlanabilir /
  // çoklu-pencere cihazlarda ekran genişliği değiştiğinde banner yanlış
  // genişlikte kalıyordu. useWindowDimensions canlı değeri verir.
  const { width: screenW } = useWindowDimensions();
  // Sekme cubugu + SABIT reklam alani toplam yuksekligi.
  const bottomChrome = useBottomChromeHeight();
  const [confirmReset, setConfirmReset] = useState(false);
  const [showTargets, setShowTargets] = useState(false);
  const [showDhikrPicker, setShowDhikrPicker] = useState(false);
  // Kontrol katmaninin GERCEK yuksekligi (olculur). Sayac halkasinin alt
  // bosslugu bundan hesaplanir; boylece Sade Mod'da / Buyuk Yazi Modu'nda /
  // farkli ekran boylarinda halka ile dugmeler ASLA cakismaz.
  const [controlsH, setControlsH] = useState(0);
  // Kısa bilgi baloncuğu — bir kontrole basıldığında NE OLDUĞUNU söyler.
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

  // Ses: hook kosulsuz cagrilir, calip calmayacagina icerde karar verilir.
  const playSound = useTesbihSounds(soundOn);

  // Keep screen awake if enabled
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

  // QA UX-1 (raporun "en yuksek degerli UX iyilestirmesi" dedigi madde):
  // Hedefe ulasildiginda — uygulamadaki EN ANLAMLI an — hicbir mesaj,
  // kutlama veya belirgin durum yoktu; sadece taneler altin oluyordu.
  // Artik acik bir bildirim + gucli titresim + hedef sesi veriliyor.
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
        `Hedefe ulaştınız — ${activeDhikrState.target} ${activeDhikr.name}. Allah kabul etsin.`
      );
    }
  };

  const counterAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowAnim = useAnimatedStyle(() => ({
    opacity: glow.value * 0.8,
  }));

  const size = Math.min(screenW - 40, 360);

  // QA UX-2: Hedef asildiginda ekran "50 / 33" gibi anlamsiz bir oran
  // gosteriyor ve halka hep dolu kaliyordu; kac TUR tamamlandigi hicbir
  // yerde yazmiyordu. Artik:
  //   - tamamlanan tur sayisi hesaplanir ve rozet olarak gosterilir,
  //   - halka her yeni turda bastan doldugu icin ilerleme anlamli kalir.
  const targetCount = Math.max(1, activeDhikrState.target);
  const totalCount = activeDhikrState.count;
  const completedLaps = Math.floor(totalCount / targetCount);
  const countInLap = totalCount % targetCount;
  // Tam kat basildiginda (orn. 33/33, 66/33) halka DOLU gorunmeli, 0 degil.
  const progress =
    totalCount > 0 && countInLap === 0 ? 1 : countInLap / targetCount;

  const counterDigits = String(activeDhikrState.count).length;
  const counterFontSize = getCounterFontSize(bigText, counterDigits);
  // BUG-009: Zikir Seç / Hedef Seç modalları açıkken reklam alanını gizle —
  // native SurfaceView tabanlı reklamlar bazı Android sürümlerinde modal
  // katmanının üstünde görünebiliyordu. Modal artık native <Modal>
  // kullandığı için ayrı bir pencere katmanında render olur, ancak bu ek
  // önlem kullanıcının talep ettiği "güvenli" davranışı garantiler.
  const anyOverlayOpen = showDhikrPicker || showTargets || confirmReset;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <LinearGradient
        colors={[theme.emeraldDeep, theme.bg, theme.navy]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Icerik: kalan alani kaplar, banner alta sigsin diye. */}
      <View style={{ flex: 1 }}>
      {/* Header — current dhikr + progress. BUG-013 safe-area: insets.top
          kadar üstten pay bırakılır ki brand yazısı status bar altına
          girmesin. */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.xl },
        ]}
      >
        <Text style={[styles.brandTitle, { color: theme.gold }]}>ZİKİRMATİK</Text>
        <Text style={[styles.todayLine, { color: theme.textMuted }]}>
          Bugün {todayTotal()} zikir
        </Text>
        <Pressable
          onPress={() => setShowDhikrPicker(true)}
          style={[
            styles.dhikrPill,
            { borderColor: theme.gold, backgroundColor: theme.emeraldDeep },
          ]}
          testID="active-dhikr-selector"
        >
          <Text
            style={[styles.dhikrName, { color: theme.gold, fontFamily: fonts.display }]}
            numberOfLines={1}
          >
            {activeDhikr.name}
          </Text>
          <Ionicons name="chevron-down" size={14} color={theme.gold} />
        </Pressable>
        {"arabic" in activeDhikr && activeDhikr.arabic ? (
          <Text
            style={[styles.arabic, { color: theme.textMuted }]}
            numberOfLines={1}
          >
            {activeDhikr.arabic}
          </Text>
        ) : null}
        <View style={styles.progressRow}>
          <Pressable
            onPress={() => setShowTargets(true)}
            style={[styles.progressPill, { borderColor: theme.border }]}
            testID="target-selector"
          >
            <Text style={[styles.progressText, { color: theme.text }]}>
              {activeDhikrState.count} / {activeDhikrState.target}
            </Text>
          </Pressable>
          {/* UX-2: tamamlanan tur sayisi */}
          {completedLaps > 0 ? (
            <View
              style={[
                styles.lapBadge,
                { borderColor: theme.gold, backgroundColor: theme.emeraldDeep },
              ]}
              testID="lap-badge"
            >
              <Ionicons name="checkmark-circle" size={12} color={theme.gold} />
              <Text style={[styles.lapText, { color: theme.gold }]}>
                {completedLaps} tur
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Big touchable counter.
          BUG-008 çözümü: Pressable yerine `MultiTouchTapArea` (RNGH
          `Gesture.Manual().onTouchesDown`) kullanılıyor — her fiziksel
          parmak downu ayrı sayım üretir, release/move ek sayım yaratmaz,
          tek-parmak %100 doğruluğu korunur.
          Modal açıkken `disabled` ile dokunuşlar tamamen yok sayılır. */}
      <MultiTouchTapArea
        style={styles.tapArea}
        onTap={doTap}
        testID="counter-tap-area"
        disabled={anyOverlayOpen}
      >
        {/* Alt bosluk = sekme cubugu + SABIT reklam alani + olculen
            kontrol yuksekligi. Sayac halkasi hicbir cihazda dugmelerin
            veya reklam alaninin altinda kalmaz. */}
        <View
          style={[
            styles.centerCol,
            { paddingBottom: bottomChrome + controlsH + spacing.md },
          ]}
        >
          <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
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
                { width: size * 0.9, height: size * 0.9, borderRadius: size * 0.45, borderColor: theme.gold, pointerEvents: "none" },
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
                {activeDhikrState.count}
              </Text>
            </Animated.View>
          </View>
        </View>
      </MultiTouchTapArea>

      {/* Floating controls (glass pills) */}
      <View
        style={[
          styles.controls,
          {
            // Kontroller SABIT reklam alaninin ve sekme cubugunun
            // USTUNDE konumlanir. AdMob politikasi: tiklanabilir
            // kontroller banner'a YAPISIK olmamali (yanlislikla reklam
            // tiklamasi = gecersiz trafik) — bu yuzden ek guvenli bosluk.
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
        <View style={styles.controlsRow}>
          <ControlPill
            icon="arrow-undo-outline"
            label="Geri Al"
            onPress={() => {
              undo();
              triggerHaptic("light");
            }}
            theme={theme}
            testID="undo-button"
          />
          <ControlPill
            icon="refresh-outline"
            label="Sıfırla"
            onPress={() => setConfirmReset(true)}
            theme={theme}
            testID="reset-button"
          />
        </View>
        {/* Kısa bilgi baloncuğu — hangi kontrolün ne yaptığı anında görünür.
            Alan HER ZAMAN ayrılır (opacity ile gösterilir/gizlenir) ki
            baloncuk çıkıp kaybolurken düğmeler yukarı-aşağı zıplamasın. */}
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
              style={{ color: theme.text, fontSize: 13 }}
              testID="home-toast"
              numberOfLines={1}
            >
              {toast ?? " "}
            </Text>
          </View>
        </View>

        {/* DÜZELTME: Bu dört düğmenin hiçbirinde etiket yoktu; özellikle
            "güneş" (Ekranı Açık Tut) düğmesine basıldığında ekranda hiçbir
            değişiklik görünmediği için kullanıcı düğmenin bozuk olduğunu
            düşünüyordu. Artık her düğmenin altında adı yazıyor, basınca
            titreşim + bilgi baloncuğu geliyor ve aktif durum altın renkli
            dolgu ile net şekilde belli oluyor. */}
        {!simpleMode ? (
          <View style={styles.controlsRow}>
            <IconToggle
              icon={vibration ? "phone-portrait" : "phone-portrait-outline"}
              label="Titreşim"
              active={vibration}
              onPress={() => {
                const nextVal = !vibration;
                updateSettings({ vibration: nextVal });
                // Titreşim AÇILIRKEN geri bildirim ver (kapatırken verme).
                if (nextVal) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                showToast(nextVal ? "Titreşim açık" : "Titreşim kapalı");
              }}
              theme={theme}
              testID="vibration-toggle"
            />
            <IconToggle
              icon={soundOn ? "volume-medium" : "volume-mute-outline"}
              label="Ses"
              active={soundOn}
              onPress={() => {
                const nextVal = !soundOn;
                updateSettings({ sound: nextVal });
                triggerHaptic("light");
                if (nextVal) playSound("tap");
                showToast(nextVal ? "Tesbih sesi açık" : "Tesbih sesi kapalı");
              }}
              theme={theme}
              testID="sound-toggle"
            />
            <IconToggle
              icon={keepAwake ? "sunny" : "sunny-outline"}
              label="Ekran"
              active={keepAwake}
              onPress={() => {
                const nextVal = !keepAwake;
                updateSettings({ keepAwake: nextVal });
                triggerHaptic("light");
                showToast(
                  nextVal
                    ? "Ekran açık kalacak (zikir sırasında sönmez)"
                    : "Ekran normal süresinde sönecek"
                );
              }}
              theme={theme}
              testID="keepawake-toggle"
            />
            <IconToggle
              icon="apps-outline"
              label="Tesbihat"
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
        title="Sayacı sıfırla?"
        message={`${activeDhikr.name} için mevcut sayaç sıfırlanacak. Toplam ve istatistikler korunur.`}
        confirmLabel="Sıfırla"
        destructive
        onConfirm={() => {
          setConfirmReset(false);
          reset();
          triggerHaptic("light");
        }}
        onCancel={() => setConfirmReset(false)}
        theme={theme}
        testID="reset-confirm"
      />

      {/* Target selector modal */}
      <TargetPickerSheet
        visible={showTargets}
        current={activeDhikrState.target}
        onPick={(t) => {
          setTargetForActive(t);
          setShowTargets(false);
        }}
        onClose={() => setShowTargets(false)}
        theme={theme}
      />

      {/* Dhikr picker */}
      <DhikrPickerSheet
        visible={showDhikrPicker}
        onClose={() => setShowDhikrPicker(false)}
      />
      </View>
    {/* NOT: Reklam alani artik BU EKRANDA DEGIL — sekme cubugunun hemen
        ustunde, `app/(tabs)/_layout.tsx` icinde SABIT olarak duruyor.
        Boylece dort sekmenin tamaminda ayni yerde ve her zaman gorunur;
        arka plandaki sekmelerin gorunmeyen banner'lari da olusmuyor. */}
    </View>
  );
}

function ControlPill({
  icon,
  label,
  onPress,
  theme,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  theme: any;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        { borderColor: theme.border, backgroundColor: theme.bgCard + "cc" },
      ]}
      testID={testID}
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
  /** Düğmenin altında görünen kısa Türkçe ad. */
  label: string;
  active: boolean;
  onPress: () => void;
  theme: any;
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
            // Aktif durum artık sadece ikon rengiyle değil, altın tonlu bir
            // dolgu ve daha kalın kenarlıkla da belli oluyor.
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

// Target picker
// BUG-006 + BUG-009 duzeltmesi: plain View overlay yerine RN'in native
// <Modal> bileşeni kullanılıyor. Bu; (1) Android donanım Geri tuşunu
// otomatik olarak `onRequestClose` ile yakalar (uygulamayı kapatmaz),
// (2) ayrı bir native pencere katmanında render olduğu için SurfaceView
// tabanlı reklamların ÜZERİNDE her zaman görünür.
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
  theme: any;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[StyleSheet.absoluteFillObject, styles.modalOverlay, { backgroundColor: theme.overlay }]}>
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
          <Text style={[styles.modalTitle, { color: theme.text }]}>Hedef Seç</Text>
          <View style={styles.targetGrid}>
            {TARGET_PRESETS.map((t) => (
              <Pressable
                key={t}
                onPress={() => onPick(t)}
                style={[
                  styles.targetChip,
                  {
                    borderColor: t === current ? theme.gold : theme.border,
                    backgroundColor: t === current ? theme.emeraldDeep : "transparent",
                  },
                ]}
                testID={`target-${t}`}
              >
                <Text
                  style={{
                    color: t === current ? theme.gold : theme.text,
                    fontSize: 18,
                    fontWeight: "600",
                  }}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.modalHint, { color: theme.textSubtle }]}>
            Özel hedef için özel zikir oluşturabilirsiniz.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// Dhikr picker
function DhikrPickerSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { theme, allDhikrs, state, setActiveDhikr } = useStore();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[StyleSheet.absoluteFillObject, styles.modalOverlay, { backgroundColor: theme.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
              maxHeight: "72%",
              paddingBottom: 0,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.text }]}>Zikir Seç</Text>
          {/* BUG-005: liste artik kaydirilabilir — 6'dan fazla zikir olsa
              bile tumune (ozellikle listenin sonundaki ozel zikirlere)
              erisilebilir. */}
          <ScrollView
            style={{ marginTop: 4 }}
            contentContainerStyle={{
              gap: 8,
              paddingBottom: insets.bottom + spacing.lg,
            }}
            showsVerticalScrollIndicator={false}
            testID="dhikr-picker-scroll"
          >
            {allDhikrs.map((d) => {
              const s = state.dhikrStates[d.id];
              const active = state.activeDhikrId === d.id;
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
                    },
                  ]}
                  testID={`dhikr-pick-${d.id}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}
                    >
                      {d.name}
                    </Text>
                    {"arabic" in d && d.arabic ? (
                      <Text style={{ color: theme.textMuted, fontSize: 14, marginTop: 2 }}>
                        {d.arabic}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: theme.gold, fontSize: 14 }}>
                    {s?.count || 0} / {s?.target || d.defaultTarget}
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
  // Banner icin sabit yukseklikli alan. Genislik cihaza gore
  // adaptive banner tarafindan doldurulur (responsive).
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dhikrName: {
    fontSize: 20,
    letterSpacing: 0.5,
  },
  arabic: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  lapBadge: {
    flexDirection: "row",
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
  hint: {
    // BUG-011 temizliği: `textTransform: "uppercase"` cihaz locale'ine bağlı
    // Türkçe İ/ı dönüşümünü bozabildiği için kaldırıldı (bu stil şu an JSX'te
    // kullanılmıyor; büyük harfli metinler doğrudan Türkçe yazılıyor).
    fontSize: 12,
    letterSpacing: 1.5,
    marginTop: spacing.sm,
  },
  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    gap: spacing.md,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
  },
  pill: {
    flexDirection: "row",
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
  targetGrid: {
    flexDirection: "row",
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
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
});
