// Ayarlar — tema, ses, titreşim, büyük yazı, sade mod, ekran açık, bildirim, günlük hedef.

import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import * as Application from "expo-application";
import React, { useEffect, useState } from "react";
import { Keyboard, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";

import { Text, TextInput } from "@/src/components/AppText";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  cancelDailyReminder,
  requestNotificationPermission,
  scheduleDailyReminder,
} from "@/src/lib/notifications";
import { StatusBarScrim } from "@/src/components/StatusBarScrim";
import { useBottomChromeHeight } from "@/src/lib/layout";
import { useAds } from "@/src/ads/AdsProvider";
import { useStore } from "@/src/lib/store";
import { fonts, radius, spacing } from "@/src/lib/theme";
import { parsePositiveInteger } from "@/src/lib/validation";

const GOAL_PRESETS = [33, 100, 300, 500, 1000];

export default function Ayarlar() {
  const { theme, state, updateSettings } = useStore();
  const { privacyOptionsRequired, showPrivacyOptions } = useAds();
  const bottomChrome = useBottomChromeHeight();
  const s = state.settings;
  const [customGoal, setCustomGoal] = useState("");
  const [goalError, setGoalError] = useState<string | null>(null);
  const [goalApplied, setGoalApplied] = useState(false);
  const [permBlockedAt, setPermBlockedAt] = useState<number | null>(null);

  // BUG-016 duzeltmesi: onceden `useFocusEffect`'in blur temizligi kullanildi,
  // ancak test agent'i navigasyon hedefi Ana Sayfa (Tabs'in ilk/varsayilan
  // rotasi) oldugunda bu temizligin GUVENILMEZ calistigini tespit etti
  // (react-navigation'in focus/blur olay zamanlamasi index rotasi icin
  // farkli davranabiliyor). Bunun yerine expo-router'in `usePathname()`'ini
  // kullaniyoruz — bu, navigasyon "focus" event'lerinden BAGIMSIZ olarak
  // dogrudan router state'ini okur ve HANGI sekmeye gidildiginden bagimsiz,
  // tutarli sekilde calisir.
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname.includes("ayarlar")) {
      setCustomGoal("");
      setGoalError(null);
      setGoalApplied(false);
    }
  }, [pathname]);

  const onToggleReminder = async (val: boolean) => {
    if (val) {
      const p = await requestNotificationPermission();
      if (!p.granted) {
        updateSettings({ reminderEnabled: false });
        if (!p.canAskAgain) {
          setPermBlockedAt(Date.now());
        }
        return;
      }
      const ok = await scheduleDailyReminder(s.reminderHour, s.reminderMinute);
      if (ok) {
        updateSettings({ reminderEnabled: true });
      }
    } else {
      await cancelDailyReminder();
      updateSettings({ reminderEnabled: false });
    }
  };

  const shiftHour = async (delta: number) => {
    const nh = (s.reminderHour + delta + 24) % 24;
    updateSettings({ reminderHour: nh });
    if (s.reminderEnabled) {
      await scheduleDailyReminder(nh, s.reminderMinute);
    }
  };

  const shiftMinute = async (delta: number) => {
    const nm = (s.reminderMinute + delta + 60) % 60;
    updateSettings({ reminderMinute: nm });
    if (s.reminderEnabled) {
      await scheduleDailyReminder(s.reminderHour, nm);
    }
  };

  // BUG-003: hem burada hem Özel Zikir Ekle'de AYNI paylaşılan doğrulama
  // mantığı (`parsePositiveInteger`) kullanılır.
  //
  // QA BUG-014: Rapor iki eksik bildirdi:
  //   1) Gecersiz deger (0, -5) sessizce reddediliyor, HATA MESAJI YOK.
  //      → `setGoalError` zaten ekleniyordu; mesaj metni daha acik hale
  //        getirildi ve alan temizlenmiyor (kullanici ne yazdigini gorsun).
  //   2) "Uygula"dan sonra sayisal KLAVYE ACIK KALIYOR ve alt gezinme
  //      cubugunu kapatiyor. → Klavye her iki durumda da kapatilir.
  const onApplyCustomGoal = () => {
    const result = parsePositiveInteger(customGoal);
    if (!result.valid || !result.value) {
      setGoalError(
        result.error || "Hedef 1 veya daha büyük bir tam sayı olmalıdır."
      );
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

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      {/* BUG-013: kaydirilan icerik durum cubugunun altina sizmasin. */}
      <StatusBarScrim />
      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing.lg,
          // Sekme cubugu + SABIT reklam alani + guvenli alan.
          paddingBottom: bottomChrome + spacing.lg,
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        // BUG-003 kök neden düzeltmesi: bu prop olmadan, klavye açıkken bu
        // ScrollView içindeki başka bir kontrole (örn. "Uygula" butonu)
        // yapılan İLK dokunuş sadece klavyeyi kapatıyor, buton basılmıyordu.
        // "Özel Zikir Ekle" ekranı bunu zaten doğru yapıyordu — aynı davranış
        // burada da uygulandı.
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.h1, { color: theme.text, fontFamily: fonts.display }]}>
          Ayarlar
        </Text>

        {/* Görünüm */}
        <Section title="GÖRÜNÜM" theme={theme}>
          <SettingRow
            icon="contrast-outline"
            label="Koyu Tema"
            theme={theme}
            testID="setting-theme"
            right={
              <Switch
                value={s.theme === "dark"}
                onValueChange={(v) => updateSettings({ theme: v ? "dark" : "light" })}
                trackColor={{ true: theme.gold, false: theme.border }}
                thumbColor={theme.bg}
                testID="theme-switch"
              />
            }
          />
          {/* Büyük Yazı Modu — v1.0.17'de gerçekten çalışır hale getirildi.
              Artık uygulamadaki TÜM yazılar %22 büyür (bkz.
              src/lib/fontScale.tsx + src/components/AppText.tsx). Kullanıcı
              ne olduğunu anlasın diye açıklama ve canlı önizleme eklendi. */}
          <SettingRow
            icon="text-outline"
            label="Büyük Yazı Modu"
            description="Uygulamadaki tüm yazıları daha büyük ve okunaklı gösterir."
            theme={theme}
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
            <Text style={{ color: theme.textSubtle, fontSize: 11, letterSpacing: 1 }}>
              ÖNİZLEME
            </Text>
            <Text style={{ color: theme.text, fontSize: 15, marginTop: 4 }}>
              Sübhanallah · Elhamdülillah · Allahu Ekber
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
              {s.bigText
                ? "Büyük yazı açık — yazılar %22 daha büyük görünür."
                : "Büyük yazı kapalı — standart boyut."}
            </Text>
          </View>
          <SettingRow
            icon="leaf-outline"
            label="Sade Kullanım Modu"
            description="Kontrolleri sadeleştirir, sayaca odaklanmanızı sağlar."
            theme={theme}
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

        {/* Geri bildirim */}
        <Section title="GERİ BİLDİRİM" theme={theme}>
          <SettingRow
            icon="phone-portrait-outline"
            label="Titreşim"
            theme={theme}
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
          <SettingRow
            icon="volume-medium-outline"
            label="Tesbih Tanesi Sesi"
            description="İsteğe bağlı, çok hafif bir dokunuş sesi."
            theme={theme}
            testID="setting-sound"
            right={
              <Switch
                value={s.sound}
                onValueChange={(v) => updateSettings({ sound: v })}
                trackColor={{ true: theme.gold, false: theme.border }}
                thumbColor={theme.bg}
                testID="sound-switch"
              />
            }
          />
          <SettingRow
            icon="sunny-outline"
            label="Ekranı Açık Tut"
            description="Ana Sayfa açıkken ekran kapanmasın."
            theme={theme}
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
        </Section>

        {/* Günlük hedef */}
        <Section title="GÜNLÜK HEDEF" theme={theme}>
          <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: spacing.sm }}>
            İstatistiklerde ilerleme çubuğunu belirler. Şu an aktif hedef:{" "}
            <Text style={{ color: theme.gold, fontWeight: "700" }}>{s.dailyGoal}</Text>
          </Text>
          <View style={styles.goalRow}>
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
              >
                <Text
                  style={{
                    color: s.dailyGoal === g ? theme.gold : theme.text,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.goalInputRow}>
            <TextInput
              value={customGoal}
              onChangeText={(t) => {
                setCustomGoal(t);
                setGoalError(null);
                setGoalApplied(false);
              }}
              keyboardType="number-pad"
              placeholder="Özel hedef (örn. 250)"
              placeholderTextColor={theme.textSubtle}
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: goalError ? theme.danger : theme.border,
                },
              ]}
              testID="custom-goal-input"
              returnKeyType="done"
              onSubmitEditing={onApplyCustomGoal}
            />
            <Pressable
              onPress={onApplyCustomGoal}
              style={[
                styles.applyBtn,
                { backgroundColor: theme.gold },
              ]}
              testID="apply-goal-btn"
            >
              <Text style={{ color: theme.bg, fontWeight: "700" }}>Uygula</Text>
            </Pressable>
          </View>
          {goalError ? (
            <Text style={{ color: theme.danger, fontSize: 12, marginTop: 6 }}>
              {goalError}
            </Text>
          ) : null}
          {goalApplied ? (
            <Text style={{ color: theme.gold, fontSize: 12, marginTop: 6 }} testID="goal-applied-msg">
              Günlük hedef {s.dailyGoal} olarak güncellendi.
            </Text>
          ) : null}
        </Section>

        {/* Bildirim */}
        <Section title="HATIRLATICI" theme={theme}>
          <SettingRow
            icon="notifications-outline"
            label="Günlük Hatırlatma"
            description="Zikir çekmek için nazik bir günlük hatırlatıcı."
            theme={theme}
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
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                Bildirim izni engellenmiş. Ayarlardan izin verebilirsiniz.
              </Text>
              <Pressable
                onPress={() => Linking.openSettings()}
                style={{
                  marginTop: 8,
                  alignSelf: "flex-start",
                  paddingHorizontal: spacing.md,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: theme.gold,
                }}
                testID="open-settings-btn"
              >
                <Text style={{ color: theme.bg, fontWeight: "700" }}>
                  Ayarları Aç
                </Text>
              </Pressable>
            </View>
          ) : null}
          {s.reminderEnabled ? (
            <View style={styles.timeRow}>
              <Text style={{ color: theme.textMuted, fontSize: 13, flex: 1 }}>
                Hatırlatma zamanı
              </Text>
              <TimeStepper
                value={s.reminderHour}
                onDec={() => shiftHour(-1)}
                onInc={() => shiftHour(1)}
                theme={theme}
                testIDPrefix="hour"
              />
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>
                :
              </Text>
              <TimeStepper
                value={s.reminderMinute}
                onDec={() => shiftMinute(-5)}
                onInc={() => shiftMinute(5)}
                theme={theme}
                testIDPrefix="minute"
              />
            </View>
          ) : null}
        </Section>

        {/* Uygulama Hakkında */}
        <Section title="UYGULAMA" theme={theme}>
          <View style={styles.rowInfo}>
            <Text style={{ color: theme.textMuted }}>Sürüm</Text>
            {/* BUG-012: sabit kodlanmış "1.0.0" yerine yüklü native paketten
                gerçek sürüm/derleme numarası okunur — app.json'daki değerden
                bağımsız olarak her zaman kurulu APK ile eşleşir. */}
            <Text style={{ color: theme.text }} testID="app-version-text">
              {Application.nativeApplicationVersion ?? "—"}
              {Application.nativeBuildVersion
                ? ` (${Application.nativeBuildVersion})`
                : ""}
            </Text>
          </View>
          <View style={styles.rowInfo}>
            <Text style={{ color: theme.textMuted }}>Zikir Verileri</Text>
            <Text style={{ color: theme.text }}>Yalnızca Cihaz</Text>
          </View>
          {/* DUZELTME (Play Data Safety tutarliligi):
              Eski metin "hicbir sunucuya gonderilmez" diyordu. Uygulamada
              Google AdMob SDK'si bulundugu icin bu ifade artik DOGRU DEGIL
              ve Play Console'daki Veri Guvenligi beyaniyla celisirdi
              (yaniltici beyan = politika ihlali riski).
              Yeni metin kapsami net ayiriyor: kullanicinin kendi zikir
              verileri cihazda kalir; reklam SDK'sinin veri isledigi ise
              acikca belirtiliyor. */}
          <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: spacing.sm }}>
            Zikir kayıtlarınız, hedefleriniz ve istatistikleriniz yalnızca bu
            cihazda saklanır; tarafımızca hiçbir sunucuya gönderilmez.
          </Text>
          <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: 6 }}>
            Uygulamadaki reklamlar Google AdMob tarafından sunulur. AdMob,
            reklam gösterimi ve ölçümü için reklam kimliği gibi bazı cihaz ve
            kullanım verilerini kendi politikaları kapsamında işleyebilir.
          </Text>
          {/* Gizlilik Politikası — Play Console gereklilikleriyle uyumlu,
              tarayıcıda açılan resmi politika linki. */}
          <Pressable
            onPress={() =>
              Linking.openURL(
                "https://sites.google.com/view/hedefzikirmatik/ana-sayfa"
              ).catch(() => {})
            }
            style={styles.privacyRow}
            testID="privacy-policy-row"
            accessibilityRole="link"
            accessibilityLabel="Gizlilik Politikası"
          >
            <View
              style={[styles.settingIcon, { backgroundColor: theme.emeraldDeep }]}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: "500" }}>
                Gizlilik Politikası
              </Text>
              <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: 2 }}>
                Tarayıcıda aç
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color={theme.textSubtle} />
          </Pressable>

          {/* AdMob / UMP politika gerekliliği: AB-EEA ve İngiltere'deki
              kullanıcılar reklam onayı tercihlerini SONRADAN değiştirebilmeli.
              Bu satır yalnızca UMP "gerekli" dediğinde görünür. */}
          {privacyOptionsRequired ? (
            <Pressable
              onPress={() => {
                showPrivacyOptions();
              }}
              style={styles.privacyRow}
              testID="ad-privacy-options-row"
              accessibilityRole="button"
              accessibilityLabel="Reklam Gizlilik Seçenekleri"
            >
              <View
                style={[styles.settingIcon, { backgroundColor: theme.emeraldDeep }]}
              >
                <Ionicons name="options-outline" size={18} color={theme.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: "500" }}>
                  Reklam Gizlilik Seçenekleri
                </Text>
                <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: 2 }}>
                  Kişiselleştirilmiş reklam tercihinizi değiştirin.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
            </Pressable>
          ) : null}
        </Section>

      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: any;
}) {
  return (
    <View>
      {/* BUG-011: textTransform kaldirildi — title prop'u cagiran yerlerde
          zaten dogru Türkçe buyuk harfle geliyor (device locale'ine
          bagimli olmadan). */}
      <Text
        style={{
          color: theme.textMuted,
          fontSize: 12,
          letterSpacing: 1.5,
          marginBottom: spacing.sm,
          paddingLeft: 4,
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
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  right?: React.ReactNode;
  theme: any;
  testID?: string;
}) {
  return (
    <View style={styles.settingRow} testID={testID}>
      <View style={[styles.settingIcon, { backgroundColor: theme.emeraldDeep }]}>
        <Ionicons name={icon} size={18} color={theme.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: "500" }}>
          {label}
        </Text>
        {description ? (
          <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: 2 }}>
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
  testIDPrefix,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  theme: any;
  testIDPrefix: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={onDec}
        style={[styles.stepBtn, { borderColor: theme.border }]}
        testID={`${testIDPrefix}-dec`}
      >
        <Ionicons name="chevron-down" size={16} color={theme.gold} />
      </Pressable>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700", minWidth: 32, textAlign: "center" }}>
        {String(value).padStart(2, "0")}
      </Text>
      <Pressable
        onPress={onInc}
        style={[styles.stepBtn, { borderColor: theme.border }]}
        testID={`${testIDPrefix}-inc`}
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
    flexDirection: "row",
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
  goalRow: {
    flexDirection: "row",
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
    flexDirection: "row",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.sm,
  },
  stepper: {
    flexDirection: "row",
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
    flexDirection: "row",
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingTop: spacing.md,
  },
});
