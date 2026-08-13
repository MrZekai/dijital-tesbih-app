// Özel Zikir Oluştur / Düzenle.

import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TARGET_PRESETS } from "@/src/lib/dhikrs";
import { useStore } from "@/src/lib/store";
import { fonts, radius, spacing } from "@/src/lib/theme";
import { normalizeName, parsePositiveInteger } from "@/src/lib/validation";

export default function CustomDhikrScreen() {
  const { theme, state, addCustomDhikr, updateCustomDhikr } = useStore();
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
    const norm = normalizeName(name);
    if (!norm) return null;
    const dup = state.customDhikrs.find(
      (c) => c.id !== editing?.id && normalizeName(c.name) === norm
    );
    return dup || null;
  };

  const onSave = () => {
    if (!canSave) {
      setError("Zikir adı ve hedef gerekli.");
      return;
    }
    setError(null);
    const dup = findDuplicate();
    if (dup && !duplicateConfirmed) {
      setError(
        `"${dup.name}" adında bir zikir zaten var. Yine de kaydetmek için tekrar dokunun.`
      );
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
          { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.xl },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.backBtn, { borderColor: theme.border }]}
          testID="custom-back"
        >
          <Ionicons name="close" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontFamily: fonts.display }]}>
          {editing ? "Zikri Düzenle" : "Özel Zikir Ekle"}
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
          <Text style={[styles.label, { color: theme.textMuted }]}>ZİKİR ADI</Text>
          <TextInput
            value={name}
            onChangeText={(t) => {
              setName(t);
              setDuplicateConfirmed(false);
              setError(null);
            }}
            placeholder="Örn. Yâ Rezzâk"
            placeholderTextColor={theme.textSubtle}
            style={[
              styles.input,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.bgCard },
            ]}
            testID="dhikr-name-input"
          />
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textMuted }]}>
            ARAPÇA YAZILIŞI (İSTEĞE BAĞLI)
          </Text>
          <TextInput
            value={arabic}
            onChangeText={setArabic}
            placeholder="Örn. يَا رَزَّاق"
            placeholderTextColor={theme.textSubtle}
            style={[
              styles.input,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.bgCard },
            ]}
            testID="dhikr-transliteration-input"
          />
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textMuted }]}>HEDEF</Text>
          <View style={styles.chips}>
            {TARGET_PRESETS.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTarget(t)}
                style={[
                  styles.chip,
                  {
                    borderColor: target === t ? theme.gold : theme.border,
                    backgroundColor: target === t ? theme.emeraldDeep : "transparent",
                  },
                ]}
                testID={`custom-target-${t}`}
              >
                <Text
                  style={{
                    color: target === t ? theme.gold : theme.text,
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.md }}>
            <TextInput
              value={customTarget}
              onChangeText={(t) => {
                setCustomTarget(t);
                setTargetError(null);
              }}
              placeholder="Özel hedef"
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
                if (result.valid && result.value) {
                  setTarget(result.value);
                  setCustomTarget("");
                  setTargetError(null);
                } else {
                  // BUG-014: gecersiz girisler (0, negatif, ondalik) artik
                  // sessizce yok sayilmiyor — acik hata mesaji gosterilir.
                  setTargetError(result.error || "Geçersiz değer.");
                }
              }}
              style={[styles.applyBtn, { borderColor: theme.gold }]}
              testID="apply-custom-target"
            >
              <Text style={{ color: theme.gold, fontWeight: "700" }}>Uygula</Text>
            </Pressable>
          </View>
          {targetError ? (
            <Text style={{ color: theme.danger, fontSize: 12, marginTop: 6 }}>
              {targetError}
            </Text>
          ) : null}
          <Text style={{ color: theme.textSubtle, fontSize: 12, marginTop: 6 }}>
            Seçili hedef: <Text style={{ color: theme.gold, fontWeight: "700" }}>{target}</Text>
          </Text>
        </View>

        {error ? (
          <Text style={{ color: theme.danger, fontSize: 13 }}>{error}</Text>
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
        >
          <Text style={{ color: theme.bg, fontSize: 16, fontWeight: "700" }}>
            {duplicateConfirmed
              ? "Yine de Kaydet"
              : editing
              ? "Değişiklikleri Kaydet"
              : "Zikri Kaydet"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
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
    flexDirection: "row",
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
