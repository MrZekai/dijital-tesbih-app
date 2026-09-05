// Özel Zikir Oluştur / Düzenle.

import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { Text, TextInput } from "@/src/components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@/src/i18n";
import { TARGET_PRESETS } from "@/src/lib/dhikrs";
import { useDirection } from "@/src/lib/rtl";
import { useStore } from "@/src/lib/store";
import { fonts, radius, spacing } from "@/src/lib/theme";
import { normalizeName, parsePositiveInteger } from "@/src/lib/validation";

export default function CustomDhikrScreen() {
  const { theme, state, addCustomDhikr, updateCustomDhikr } = useStore();
  const { t, n: fmt, bcp47 } = useI18n();
  const dir = useDirection();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const editing = params.id
    ? state.customDhikrs.find((c) => c.id === params.id)
    : null;

  const [name, setName] = useState(editing?.name || "");
  const [arabic, setArabic] = useState(editing?.arabic || "");
  const [target, setTarget] = useState<number>(editing?.defaultTarget || 33);
  const [customTarget, setCustomTarget] = useState("");
  const [targetError, setTargetError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // BUG-015: ayni isimde baska bir zikir bulundugunda kullaniciya once
  // uyari gosterilir; "Yine de Kaydet" ile onaylarsa kayit devam eder.
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

  const canSave = name.trim().length > 0 && target > 0;

  const findDuplicate = () => {
    // Locale duyarlı normalleştirme — Türkçe I/İ kuralı yalnızca Türkçe
    // arayüzde uygulanır (bkz. validation.ts).
    const norm = normalizeName(name, bcp47);
    if (!norm) return null;
    const dup = state.customDhikrs.find(
      (c) => c.id !== editing?.id && normalizeName(c.name, bcp47) === norm
    );
    return dup || null;
  };

  const onSave = () => {
    if (!canSave) {
      setError(t("custom.required"));
      return;
    }
    setError(null);
    const dup = findDuplicate();
    if (dup && !duplicateConfirmed) {
      setError(t("custom.duplicate", { name: dup.name }));
      setDuplicateConfirmed(true);
      return;
    }
    if (editing) {
      updateCustomDhikr(editing.id, { name, arabic, target });
    } else {
      addCustomDhikr({ name, arabic, target });
    }
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View
        style={[
          styles.header,
          {
            flexDirection: dir.row,
            paddingTop: insets.top + spacing.md,
            paddingHorizontal: spacing.xl,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.backBtn, { borderColor: theme.border }]}
          testID="custom-back"
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        >
          <Ionicons name="close" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontFamily: fonts.display }]}>
          {editing ? t("custom.title_edit") : t("custom.title_new")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.xl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text
            style={[
              styles.label,
              { color: theme.textMuted, textAlign: dir.textAlign },
            ]}
          >
            {t("custom.name_label")}
          </Text>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              setDuplicateConfirmed(false);
              setError(null);
            }}
            placeholder={t("custom.name_placeholder")}
            placeholderTextColor={theme.textSubtle}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.bgCard,
                textAlign: dir.textAlign,
                writingDirection: dir.writingDirection,
              },
            ]}
            testID="dhikr-name-input"
            accessibilityLabel={t("custom.name_label")}
          />
        </View>

        <View>
          <Text
            style={[
              styles.label,
              { color: theme.textMuted, textAlign: dir.textAlign },
            ]}
          >
            {t("custom.arabic_label")}
          </Text>
          <TextInput
            value={arabic}
            onChangeText={setArabic}
            placeholder={t("custom.arabic_placeholder")}
            placeholderTextColor={theme.textSubtle}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.bgCard,
                textAlign: "right",
                writingDirection: "rtl",
              },
            ]}
            testID="dhikr-transliteration-input"
            accessibilityLabel={t("custom.arabic_label")}
          />
        </View>

        <View>
          <Text
            style={[
              styles.label,
              { color: theme.textMuted, textAlign: dir.textAlign },
            ]}
          >
            {t("custom.target_label")}
          </Text>
          <View style={[styles.chips, { flexDirection: dir.row }]}>
            {TARGET_PRESETS.map((n) => (
              <Pressable
                key={n}
                onPress={() => setTarget(n)}
                style={[
                  styles.chip,
                  {
                    borderColor: target === n ? theme.gold : theme.border,
                    backgroundColor:
                      target === n ? theme.emeraldDeep : "transparent",
                  },
                ]}
                testID={`custom-target-${n}`}
                accessibilityRole="button"
                accessibilityState={{ selected: target === n }}
              >
                <Text
                  style={{
                    color: target === n ? theme.gold : theme.text,
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {fmt(n)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: dir.row, gap: 8, marginTop: spacing.md }}>
            <TextInput
              value={customTarget}
              onChangeText={(v) => {
                setCustomTarget(v);
                setTargetError(null);
              }}
              placeholder={t("custom.custom_target")}
              placeholderTextColor={theme.textSubtle}
              keyboardType="number-pad"
              style={[
                styles.input,
                {
                  flex: 1,
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.bgCard,
                },
              ]}
              testID="dhikr-target-input"
            />
            <Pressable
              onPress={() => {
                const result = parsePositiveInteger(customTarget);
                // QA BUG-014 tutarliligi: klavye burada da kapatilir.
                Keyboard.dismiss();
                if (result.valid && result.value) {
                  setTarget(result.value);
                  setCustomTarget("");
                  setTargetError(null);
                } else {
                  // BUG-014: gecersiz girisler (0, negatif, ondalik) artik
                  // sessizce yok sayilmiyor — acik hata mesaji gosterilir.
                  setTargetError(t(result.errorKey ?? "custom.invalid"));
                }
              }}
              style={[styles.applyBtn, { borderColor: theme.gold }]}
              testID="apply-custom-target"
            >
              <Text style={{ color: theme.gold, fontWeight: "700" }}>
                {t("common.save")}
              </Text>
            </Pressable>
          </View>
          {targetError ? (
            <Text style={{ color: theme.danger, fontSize: 12, marginTop: 6 }}>
              {targetError}
            </Text>
          ) : null}
          <Text
            style={{
              color: theme.textSubtle,
              fontSize: 12,
              marginTop: 6,
              textAlign: dir.textAlign,
            }}
          >
            {t("custom.target_label")}:{" "}
            <Text style={{ color: theme.gold, fontWeight: "700" }}>
              {fmt(target)}
            </Text>
          </Text>
        </View>

        {error ? (
          <Text
            style={{
              color: theme.danger,
              fontSize: 13,
              textAlign: dir.textAlign,
            }}
            testID="custom-error"
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={onSave}
          disabled={!canSave}
          style={[
            styles.saveBtn,
            {
              backgroundColor: canSave ? theme.gold : theme.border,
              opacity: canSave ? 1 : 0.6,
            },
          ]}
          testID="save-dhikr-btn"
          accessibilityRole="button"
        >
          <Text style={{ color: theme.bg, fontSize: 16, fontWeight: "700" }}>
            {duplicateConfirmed
              ? t("custom.save_anyway")
              : editing
                ? t("custom.save_changes")
                : t("custom.save")}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    letterSpacing: 0.3,
  },
  label: {
    // BUG-011: textTransform kaldirildi — metinler JSX'te dogrudan Türkçe
    // buyuk harfle yazildi.
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
  chips: {
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    minWidth: 70,
    alignItems: "center",
  },
  applyBtn: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
