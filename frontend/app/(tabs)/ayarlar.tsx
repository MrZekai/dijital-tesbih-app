// Ayarlar — dil, tema, ses, titreşim, büyük yazı, sade mod, ekran açık,
// bildirim, günlük hedef, yedekleme ve uygulama bilgileri.
//
// v1.1.0: Dil seçici (27 dil), üç durumlu tema (koyu/açık/sistem), yerel
// yedekleme ve sıfırlama onayı ayarı eklendi; tüm metinler i18n'e taşındı.

import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";

import { usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";

import { Text, TextInput } from "@/src/components/AppText";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAds } from "@/src/ads/AdsProvider";
import { StatusBarScrim } from "@/src/components/StatusBarScrim";
import {
  SYSTEM_LANGUAGE,
  useI18n,
  type LanguagePreference,
} from "@/src/i18n";
import { formatTime } from "@/src/i18n/format";
import { exportBackup } from "@/src/lib/backup";
import { useBottomChromeHeight } from "@/src/lib/layout";
import {
  cancelDailyReminder,
  requestNotificationPermission,
  scheduleDailyReminder,
} from "@/src/lib/notifications";
import { useDirection } from "@/src/lib/rtl";
import { useStore } from "@/src/lib/store";
import type { ThemePreference, ThemeTokens } from "@/src/lib/theme";
import { fonts, radius, spacing } from "@/src/lib/theme";
import { parsePositiveInteger } from "@/src/lib/validation";

/**
 * DERLEME PARMAK IZI.
 *
 * Neden var: QA sirasinda "degisiklikleri APK'da goremiyorum" sorunu
 * yasandi ve sebebinin eski bir commit'ten derleme oldugu ancak uzun
 * incelemeyle anlasilabildi. Artik Ayarlar > Uygulama satirinda surumun
 * yanina commit kisaltmasi yazilir; hangi kodun elde oldugu tek bakista
 * gorulur. Degeri CI `EXPO_PUBLIC_BUILD_SHA` ile enjekte eder; yerel
 * gelistirmede bos kalir ve hicbir sey gostermez.
 */
const BUILD_SHA = (process.env.EXPO_PUBLIC_BUILD_SHA ?? "").slice(0, 7);

const GOAL_PRESETS = [33, 100, 300, 500, 1000];

const PRIVACY_URL = "https://sites.google.com/view/hedefzikirmatik/ana-sayfa";

export default function Ayarlar() {
  const { theme, state, updateSettings } = useStore();
  const { privacyOptionsRequired, showPrivacyOptions } = useAds();
  const { t, n: fmt, bcp47, lang, languages, setLanguage, preference } =
    useI18n();
  const dir = useDirection();
  const bottomChrome = useBottomChromeHeight();
  const s = state.settings;
  const [customGoal, setCustomGoal] = useState("");
  const [goalError, setGoalError] = useState<string | null>(null);
  const [goalApplied, setGoalApplied] = useState(false);
  const [permBlockedAt, setPermBlockedAt] = useState<number | null>(null);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const reminderStrings = {
    channelName: t("notif.channel_name"),
    title: t("notif.title"),
    bodies: [t("notif.body_1"), t("notif.body_2"), t("notif.body_3")],
  };

  // BUG-016 duzeltmesi: `usePathname()` navigasyon focus/blur olaylarindan
  // BAGIMSIZ olarak router state'ini okur ve hangi sekmeye gidildiginden
  // bagimsiz tutarli calisir.
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname.includes("ayarlar")) {
      setCustomGoal("");
      setGoalError(null);
      setGoalApplied(false);
      setExportMsg(null);
    }
  }, [pathname]);

  // Dil değiştiğinde planlı hatırlatıcı ESKİ dilde kalırdı; yeniden planla.
  useEffect(() => {
    if (!s.reminderEnabled) return;
    scheduleDailyReminder(s.reminderHour, s.reminderMinute, {
      channelName: t("notif.channel_name"),
      title: t("notif.title"),
      bodies: [t("notif.body_1"), t("notif.body_2"), t("notif.body_3")],
    }).catch(() => {});
    // Yalnızca dil değişiminde çalışsın; saat değişimleri kendi
    // işleyicilerinde zaten yeniden planlıyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const onToggleReminder = async (val: boolean) => {
    if (val) {
      const p = await requestNotificationPermission();
      if (!p.granted) {
        updateSettings({ reminderEnabled: false });
        if (!p.canAskAgain) setPermBlockedAt(Date.now());
        return;
      }
      setPermBlockedAt(null);
      updateSettings({ reminderEnabled: true });
      await scheduleDailyReminder(s.reminderHour, s.reminderMinute, reminderStrings);
    } else {
      updateSettings({ reminderEnabled: false });
      await cancelDailyReminder();
    }
  };

  const shiftHour = async (delta: number) => {
    const nh = (s.reminderHour + delta + 24) % 24;
    updateSettings({ reminderHour: nh });
    if (s.reminderEnabled) {
      await scheduleDailyReminder(nh, s.reminderMinute, reminderStrings);
    }
  };

  const shiftMinute = async (delta: number) => {
    const nm = (s.reminderMinute + delta + 60) % 60;
    updateSettings({ reminderMinute: nm });
    if (s.reminderEnabled) {
      await scheduleDailyReminder(s.reminderHour, nm, reminderStrings);
    }
  };

  // BUG-003 / BUG-014: hem burada hem Özel Zikir Ekle'de AYNI paylaşılan
  // doğrulama mantığı kullanılır; hata mesajı gösterilir ve klavye kapanır.
  const onApplyCustomGoal = () => {
    const result = parsePositiveInteger(customGoal);
    if (!result.valid || !result.value) {
      setGoalError(t(result.errorKey ?? "validation.positive_integer"));
      setGoalApplied(false);
      Keyboard.dismiss();
      return;
    }
    updateSettings({ dailyGoal: result.value });
    setCustomGoal("");
    setGoalError(null);
    setGoalApplied(true);
    Keyboard.dismiss();
  };

  const onExport = async () => {
    setExporting(true);
    setExportMsg(null);
    const version = Application.nativeApplicationVersion ?? "unknown";
    const res = await exportBackup(state, version, t("settings.export"));
    setExporting(false);
    setExportMsg(res.ok ? t("settings.export_done") : t("settings.export_failed"));
  };

  const themeOptions: [ThemePreference, string][] = [
    ["dark", t("settings.theme_dark")],
    ["light", t("settings.theme_light")],
    ["system", t("settings.theme_system")],
  ];

  const activeLanguageName =
    languages.find((l) => l.code === lang)?.nativeName ?? lang;
  // "Sistem" seçiliyken hangi dile düşüldüğünü de göster: Sistem · Türkçe
  const currentLanguageName =
    preference === SYSTEM_LANGUAGE
      ? `${t("settings.language_system")} · ${activeLanguageName}`
      : activeLanguageName;

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <StatusBarScrim />
      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: bottomChrome + spacing.lg,
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={[
            styles.h1,
            {
              color: theme.text,
              fontFamily: fonts.display,
              textAlign: dir.textAlign,
            },
          ]}
        >
          {t("settings.title")}
        </Text>

        {/* ── Görünüm ─────────────────────────────────────────────── */}
        <Section title={t("settings.section_appearance")} theme={theme} dir={dir}>
          <Pressable
            onPress={() => setLangPickerOpen(true)}
            style={[styles.settingRow, { flexDirection: dir.row }]}
            testID="setting-language"
            accessibilityRole="button"
            accessibilityLabel={t("settings.language")}
          >
            <View
              style={[styles.settingIcon, { backgroundColor: theme.emeraldDeep }]}
            >
              <Ionicons name="language-outline" size={18} color={theme.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 15,
                  fontWeight: "500",
                  textAlign: dir.textAlign,
                }}
              >
                {t("settings.language")}
              </Text>
              <Text
                style={{
                  color: theme.textSubtle,
                  fontSize: 12,
                  marginTop: 2,
                  textAlign: dir.textAlign,
                }}
              >
                {t("settings.language_desc")}
              </Text>
            </View>
            <Text
              style={{ color: theme.gold, fontSize: 14, fontWeight: "600" }}
              numberOfLines={1}
              testID="current-language"
            >
              {currentLanguageName}
            </Text>
            <Ionicons name={dir.forwardIcon} size={18} color={theme.textSubtle} />
          </Pressable>

          <View style={{ gap: spacing.sm }}>
            <Text
              style={{
                color: theme.text,
                fontSize: 15,
                fontWeight: "500",
                textAlign: dir.textAlign,
              }}
            >
              {t("settings.theme")}
            </Text>
            <View style={[styles.segment, { flexDirection: dir.row }]}>
              {themeOptions.map(([value, label]) => {
                const on = (s.theme ?? "dark") === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => updateSettings({ theme: value })}
                    style={[
                      styles.segmentBtn,
                      {
                        borderColor: on ? theme.gold : theme.border,
                        backgroundColor: on ? theme.emeraldDeep : "transparent",
                      },
                    ]}
                    testID={`theme-${value}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text
                      style={{
                        color: on ? theme.gold : theme.textMuted,
                        fontSize: 13,
                        fontWeight: on ? "700" : "500",
                      }}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <SettingRow
            icon="text-outline"
            label={t("settings.big_text")}
            description={t("settings.big_text_desc")}
            theme={theme}
            dir={dir}
            testID="setting-bigtext"
            right={
              <Switch
                value={s.bigText}
                onValueChange={(v) => updateSettings({ bigText: v })}
                trackColor={{ true: theme.gold, false: theme.border }}
                thumbColor={theme.bg}
                testID="bigtext-switch"
              />
            }
          />
          <View
            style={[
              styles.previewBox,
              { borderColor: theme.border, backgroundColor: theme.bgElevated },
            ]}
            testID="bigtext-preview"
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 15,
                textAlign: dir.textAlign,
              }}
            >
              {t("dhikr.subhanallah")} · {t("dhikr.elhamdulillah")} ·{" "}
              {t("dhikr.allahuekber")}
            </Text>
            <Text
              style={{
                color: theme.textMuted,
                fontSize: 12,
                marginTop: 2,
                textAlign: dir.textAlign,
              }}
            >
              {s.bigText ? t("settings.big_text_on") : t("settings.big_text_off")}
            </Text>
          </View>

          <SettingRow
            icon="leaf-outline"
            label={t("settings.simple_mode")}
            description={t("settings.simple_mode_desc")}
            theme={theme}
            dir={dir}
            testID="setting-simple"
            right={
              <Switch
                value={s.simpleMode}
                onValueChange={(v) => updateSettings({ simpleMode: v })}
                trackColor={{ true: theme.gold, false: theme.border }}
                thumbColor={theme.bg}
                testID="simple-switch"
              />
            }
          />
        </Section>

        {/* ── Geri bildirim ───────────────────────────────────────── */}
        <Section title={t("settings.section_feedback")} theme={theme} dir={dir}>
          <SettingRow
            icon="phone-portrait-outline"
            label={t("settings.vibration")}
            theme={theme}
            dir={dir}
            testID="setting-vibration"
            right={
              <Switch
                value={s.vibration}
                onValueChange={(v) => updateSettings({ vibration: v })}
                trackColor={{ true: theme.gold, false: theme.border }}
                thumbColor={theme.bg}
                testID="vibration-switch"
              />
            }
          />
          {/* v1.1.0: ses ayarı İKİYE bölündü. Kullanıcı hedef dolunca ses
              istiyor ama her dokunuşta tık sesi istemiyordu. */}
          <SettingRow
            icon="notifications-circle-outline"
            label={t("settings.sound_complete")}
            description={t("settings.sound_complete_desc")}
            theme={theme}
            dir={dir}
            testID="setting-sound-complete"
            right={
              <Switch
                value={s.soundComplete !== false}
                onValueChange={(v) => updateSettings({ soundComplete: v })}
                trackColor={{ true: theme.gold, false: theme.border }}
                thumbColor={theme.bg}
                testID="sound-complete-switch"
              />
            }
          />
          <SettingRow
            icon="volume-medium-outline"
            label={t("settings.bead_sound")}
            description={t("settings.bead_sound_desc")}
            theme={theme}
            dir={dir}
            testID="setting-sound"
            right={
              <Switch
                value={s.soundTap === true}
                onValueChange={(v) =>
                  // `sound` eski sürümlerin okuduğu alan; senkron tutulur.
                  updateSettings({ soundTap: v, sound: v })
                }
                trackColor={{ true: theme.gold, false: theme.border }}
                thumbColor={theme.bg}
                testID="sound-switch"
              />
            }
          />
          <SettingRow
            icon="sunny-outline"
            label={t("settings.keep_awake")}
            description={t("settings.keep_awake_desc")}
            theme={theme}
            dir={dir}
            testID="setting-keepawake"
            right={
              <Switch
                value={s.keepAwake}
                onValueChange={(v) => updateSettings({ keepAwake: v })}
                trackColor={{ true: theme.gold, false: theme.border }}
                thumbColor={theme.bg}
                testID="keepawake-switch"
              />
            }
          />
          <SettingRow
            icon="shield-outline"
            label={t("home.reset_title")}
            description={t("home.reset_message", { name: t("common.reset") })}
            theme={theme}
            dir={dir}
            testID="setting-confirm-reset"
            right={
              <Switch
                value={s.confirmReset !== false}
                onValueChange={(v) => updateSettings({ confirmReset: v })}
                trackColor={{ true: theme.gold, false: theme.border }}
                thumbColor={theme.bg}
                testID="confirm-reset-switch"
              />
            }
          />
        </Section>

        {/* ── Günlük hedef ────────────────────────────────────────── */}
        <Section title={t("settings.section_goal")} theme={theme} dir={dir}>
          <View style={[styles.goalRow, { flexDirection: dir.row }]}>
            {GOAL_PRESETS.map((g) => (
              <Pressable
                key={g}
                onPress={() => {
                  updateSettings({ dailyGoal: g });
                  setCustomGoal("");
                  setGoalError(null);
                  setGoalApplied(false);
                }}
                style={[
                  styles.goalChip,
                  {
                    borderColor: s.dailyGoal === g ? theme.gold : theme.border,
                    backgroundColor:
                      s.dailyGoal === g ? theme.emeraldDeep : "transparent",
                  },
                ]}
                testID={`goal-${g}`}
                accessibilityRole="button"
                accessibilityState={{ selected: s.dailyGoal === g }}
              >
                <Text
                  style={{
                    color: s.dailyGoal === g ? theme.gold : theme.text,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {fmt(g)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.goalInputRow, { flexDirection: dir.row }]}>
            <TextInput
              value={customGoal}
              onChangeText={(v) => {
                setCustomGoal(v);
                setGoalError(null);
                setGoalApplied(false);
              }}
              keyboardType="number-pad"
              placeholder={t("settings.custom_goal_placeholder")}
              placeholderTextColor={theme.textSubtle}
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: goalError ? theme.danger : theme.border,
                  textAlign: dir.textAlign,
                },
              ]}
              testID="custom-goal-input"
              returnKeyType="done"
              onSubmitEditing={onApplyCustomGoal}
              accessibilityLabel={t("settings.custom_goal_placeholder")}
            />
            <Pressable
              onPress={onApplyCustomGoal}
              style={[styles.applyBtn, { backgroundColor: theme.gold }]}
              testID="apply-goal-btn"
              accessibilityRole="button"
              accessibilityLabel={t("common.save")}
            >
              <Text style={{ color: theme.bg, fontWeight: "700" }}>
                {t("common.save")}
              </Text>
            </Pressable>
          </View>
          {goalError ? (
            <Text
              style={{
                color: theme.danger,
                fontSize: 12,
                marginTop: 6,
                textAlign: dir.textAlign,
              }}
              testID="goal-error-msg"
            >
              {goalError}
            </Text>
          ) : null}
          {goalApplied ? (
            <Text
              style={{
                color: theme.gold,
                fontSize: 12,
                marginTop: 6,
                textAlign: dir.textAlign,
              }}
              testID="goal-applied-msg"
            >
              {t("settings.goal_applied", { count: s.dailyGoal })}
            </Text>
          ) : null}
        </Section>

        {/* ── Hatırlatıcı ─────────────────────────────────────────── */}
        <Section title={t("settings.section_reminder")} theme={theme} dir={dir}>
          <SettingRow
            icon="notifications-outline"
            label={t("settings.daily_reminder")}
            description={t("settings.daily_reminder_desc")}
            theme={theme}
            dir={dir}
            testID="setting-reminder"
            right={
              <Switch
                value={s.reminderEnabled}
                onValueChange={onToggleReminder}
                trackColor={{ true: theme.gold, false: theme.border }}
                thumbColor={theme.bg}
                testID="reminder-switch"
              />
            }
          />
          {permBlockedAt ? (
            <View
              style={{
                marginTop: 8,
                padding: spacing.md,
                borderRadius: radius.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.border,
                backgroundColor: theme.bgElevated,
              }}
            >
              <Text
                style={{
                  color: theme.textMuted,
                  fontSize: 13,
                  textAlign: dir.textAlign,
                }}
              >
                {t("settings.permission_blocked")}
              </Text>
              <Pressable
                onPress={() => Linking.openSettings()}
                style={{
                  marginTop: 8,
                  alignSelf: dir.isRTL ? "flex-end" : "flex-start",
                  paddingHorizontal: spacing.md,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: theme.gold,
                }}
                testID="open-settings-btn"
                accessibilityRole="button"
              >
                <Text style={{ color: theme.bg, fontWeight: "700" }}>
                  {t("settings.title")}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {s.reminderEnabled ? (
            <View style={[styles.timeRow, { flexDirection: dir.row }]}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.textMuted,
                    fontSize: 13,
                    textAlign: dir.textAlign,
                  }}
                >
                  {t("settings.reminder_time")}
                </Text>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 15,
                    fontWeight: "600",
                    textAlign: dir.textAlign,
                  }}
                  testID="reminder-time-text"
                >
                  {formatTime(s.reminderHour, s.reminderMinute, bcp47)}
                </Text>
              </View>
              <TimeStepper
                value={s.reminderHour}
                onDec={() => shiftHour(-1)}
                onInc={() => shiftHour(1)}
                theme={theme}
                dir={dir}
                testIDPrefix="hour"
              />
              <TimeStepper
                value={s.reminderMinute}
                onDec={() => shiftMinute(-5)}
                onInc={() => shiftMinute(5)}
                theme={theme}
                dir={dir}
                testIDPrefix="minute"
              />
            </View>
          ) : null}
        </Section>

        {/* ── Verileriniz ─────────────────────────────────────────── */}
        <Section title={t("settings.section_data")} theme={theme} dir={dir}>
          <SettingRow
            icon="save-outline"
            label={t("settings.export")}
            description={t("settings.export_desc")}
            theme={theme}
            dir={dir}
            testID="setting-export"
            right={
              <Pressable
                onPress={onExport}
                disabled={exporting}
                style={[
                  styles.applyBtn,
                  { backgroundColor: exporting ? theme.border : theme.gold },
                ]}
                testID="export-btn"
                accessibilityRole="button"
                accessibilityLabel={t("settings.export")}
              >
                <Text style={{ color: theme.bg, fontWeight: "700" }}>
                  {exporting ? t("common.loading") : t("common.save")}
                </Text>
              </Pressable>
            }
          />
          {exportMsg ? (
            <Text
              style={{
                color: theme.gold,
                fontSize: 12,
                textAlign: dir.textAlign,
              }}
              testID="export-msg"
            >
              {exportMsg}
            </Text>
          ) : null}
        </Section>

        {/* ── Uygulama ────────────────────────────────────────────── */}
        <Section title={t("settings.section_app")} theme={theme} dir={dir}>
          <View style={[styles.rowInfo, { flexDirection: dir.row }]}>
            <Text style={{ color: theme.textMuted }}>{t("settings.version")}</Text>
            {/* BUG-012: sabit kodlanmış sürüm yerine yüklü native paketten
                gerçek sürüm/derleme numarası okunur. */}
            <Text style={{ color: theme.text }} testID="app-version-text">
              {Application.nativeApplicationVersion ?? "—"}
              {Application.nativeBuildVersion
                ? ` (${Application.nativeBuildVersion})`
                : ""}
              {BUILD_SHA ? ` · ${BUILD_SHA}` : ""}
            </Text>
          </View>

          <Text
            style={{
              color: theme.textSubtle,
              fontSize: 12,
              marginTop: spacing.sm,
              textAlign: dir.textAlign,
              writingDirection: dir.writingDirection,
            }}
            testID="data-notice"
          >
            {t("settings.data_notice")}
          </Text>

          <Pressable
            onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
            style={[styles.privacyRow, { flexDirection: dir.row }]}
            testID="privacy-policy-row"
            accessibilityRole="link"
            accessibilityLabel={t("settings.privacy_policy")}
          >
            <View
              style={[styles.settingIcon, { backgroundColor: theme.emeraldDeep }]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={theme.gold}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 15,
                  fontWeight: "500",
                  textAlign: dir.textAlign,
                }}
              >
                {t("settings.privacy_policy")}
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color={theme.textSubtle} />
          </Pressable>

          {/* AdMob / UMP politika gerekliliği: AB-EEA ve İngiltere'deki
              kullanıcılar reklam onayı tercihlerini SONRADAN değiştirebilmeli.
              Bu satır yalnızca UMP "gerekli" dediğinde görünür. */}
          {privacyOptionsRequired ? (
            <Pressable
              onPress={() => showPrivacyOptions()}
              style={[styles.privacyRow, { flexDirection: dir.row }]}
              testID="ad-privacy-options-row"
              accessibilityRole="button"
              accessibilityLabel={t("settings.ad_privacy_options")}
            >
              <View
                style={[styles.settingIcon, { backgroundColor: theme.emeraldDeep }]}
              >
                <Ionicons name="options-outline" size={18} color={theme.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 15,
                    fontWeight: "500",
                    textAlign: dir.textAlign,
                  }}
                >
                  {t("settings.ad_privacy_options")}
                </Text>
              </View>
              <Ionicons name={dir.forwardIcon} size={18} color={theme.textSubtle} />
            </Pressable>
          ) : null}
        </Section>
      </ScrollView>

      <LanguagePicker
        visible={langPickerOpen}
        onClose={() => setLangPickerOpen(false)}
        onPick={async (code) => {
          setLangPickerOpen(false);
          await setLanguage(code);
        }}
      />
    </SafeAreaView>
  );
}

function LanguagePicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (code: LanguagePreference) => void;
}) {
  const { theme } = useStore();
  const { t, lang, languages, preference, deviceTag } = useI18n();
  const dir = useDirection();
  const systemOn = preference === SYSTEM_LANGUAGE;
  const autoName =
    languages.find((l) => l.code === lang)?.nativeName ?? lang;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: theme.bgCard, borderColor: theme.border },
          ]}
          testID="language-picker"
        >
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: "700",
              textAlign: dir.textAlign,
            }}
          >
            {t("settings.select_language")}
          </Text>
          <ScrollView
            style={{ marginTop: spacing.md }}
            contentContainerStyle={{ gap: 6, paddingBottom: spacing.xl }}
            showsVerticalScrollIndicator={false}
          >
            {/* Cihazı takip et — en üstte, varsayılan davranış. */}
            <Pressable
              onPress={() => onPick(SYSTEM_LANGUAGE)}
              style={[
                styles.langRow,
                {
                  borderColor: systemOn ? theme.gold : theme.border,
                  backgroundColor: systemOn ? theme.emeraldDeep : "transparent",
                  flexDirection: dir.row,
                },
              ]}
              testID="lang-system"
              accessibilityRole="button"
              accessibilityState={{ selected: systemOn }}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={18}
                color={systemOn ? theme.gold : theme.textSubtle}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: systemOn ? theme.gold : theme.text,
                    fontSize: 16,
                    fontWeight: systemOn ? "700" : "500",
                    textAlign: dir.textAlign,
                  }}
                >
                  {t("settings.language_system")}
                </Text>
                <Text
                  style={{
                    color: theme.textSubtle,
                    fontSize: 12,
                    marginTop: 1,
                    textAlign: dir.textAlign,
                  }}
                  testID="lang-system-detected"
                >
                  {autoName}
                  {deviceTag ? ` · ${deviceTag}` : ""}
                </Text>
              </View>
              {systemOn ? (
                <Ionicons name="checkmark" size={18} color={theme.gold} />
              ) : null}
            </Pressable>

            {languages.map((l) => {
              const on = !systemOn && l.code === lang;
              return (
                <Pressable
                  key={l.code}
                  onPress={() => onPick(l.code)}
                  style={[
                    styles.langRow,
                    {
                      borderColor: on ? theme.gold : theme.border,
                      backgroundColor: on ? theme.emeraldDeep : "transparent",
                      flexDirection: dir.row,
                    },
                  ]}
                  testID={`lang-${l.code}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${l.nativeName} — ${l.englishName}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: on ? theme.gold : theme.text,
                        fontSize: 16,
                        fontWeight: on ? "700" : "500",
                        textAlign: dir.textAlign,
                        writingDirection: l.rtl ? "rtl" : "ltr",
                      }}
                    >
                      {l.nativeName}
                    </Text>
                    <Text
                      style={{
                        color: theme.textSubtle,
                        fontSize: 12,
                        marginTop: 1,
                        textAlign: dir.textAlign,
                      }}
                    >
                      {l.englishName}
                    </Text>
                  </View>
                  {on ? (
                    <Ionicons name="checkmark" size={18} color={theme.gold} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Section({
  title,
  children,
  theme,
  dir,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeTokens;
  dir: ReturnType<typeof useDirection>;
}) {
  return (
    <View>
      <Text
        style={{
          color: theme.textMuted,
          fontSize: 12,
          letterSpacing: 1.5,
          marginBottom: spacing.sm,
          paddingHorizontal: 4,
          textAlign: dir.textAlign,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          borderRadius: radius.lg,
          backgroundColor: theme.bgCard,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
          padding: spacing.md,
          gap: spacing.md,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  description,
  right,
  theme,
  dir,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  right?: React.ReactNode;
  theme: ThemeTokens;
  dir: ReturnType<typeof useDirection>;
  testID?: string;
}) {
  return (
    <View style={[styles.settingRow, { flexDirection: dir.row }]} testID={testID}>
      <View style={[styles.settingIcon, { backgroundColor: theme.emeraldDeep }]}>
        <Ionicons name={icon} size={18} color={theme.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: theme.text,
            fontSize: 15,
            fontWeight: "500",
            textAlign: dir.textAlign,
          }}
        >
          {label}
        </Text>
        {description ? (
          <Text
            style={{
              color: theme.textSubtle,
              fontSize: 12,
              marginTop: 2,
              textAlign: dir.textAlign,
              writingDirection: dir.writingDirection,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

function TimeStepper({
  value,
  onDec,
  onInc,
  theme,
  dir,
  testIDPrefix,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  theme: ThemeTokens;
  dir: ReturnType<typeof useDirection>;
  testIDPrefix: string;
}) {
  return (
    <View style={[styles.stepper, { flexDirection: dir.row }]}>
      <Pressable
        onPress={onDec}
        style={[styles.stepBtn, { borderColor: theme.border }]}
        testID={`${testIDPrefix}-dec`}
        accessibilityRole="button"
        hitSlop={6}
      >
        <Ionicons name="chevron-down" size={16} color={theme.gold} />
      </Pressable>
      <Text
        style={{
          color: theme.text,
          fontSize: 18,
          fontWeight: "700",
          minWidth: 32,
          textAlign: "center",
        }}
      >
        {String(value).padStart(2, "0")}
      </Text>
      <Pressable
        onPress={onInc}
        style={[styles.stepBtn, { borderColor: theme.border }]}
        testID={`${testIDPrefix}-inc`}
        accessibilityRole="button"
        hitSlop={6}
      >
        <Ionicons name="chevron-up" size={16} color={theme.gold} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  h1: {
    fontSize: 34,
    fontWeight: "300",
    letterSpacing: 0.5,
  },
  settingRow: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 4,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  segment: {
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
  },
  goalRow: {
    flexWrap: "wrap",
    gap: 8,
  },
  goalChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    minWidth: 60,
    alignItems: "center",
  },
  goalInputRow: {
    gap: 8,
    marginTop: spacing.md,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
  },
  applyBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  timeRow: {
    alignItems: "center",
    gap: 8,
    marginTop: spacing.sm,
  },
  stepper: {
    alignItems: "center",
    gap: 6,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: {
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  previewBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 2,
  },
  privacyRow: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.18)",
    paddingTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "82%",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
  },
  langRow: {
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
