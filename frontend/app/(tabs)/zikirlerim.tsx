// Zikirlerim — hazır zikirler + özel zikirler listesi + Namaz Sonrası Tesbihat kartı.

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmSheet } from "@/src/components/ConfirmSheet";
import { BottomBanner } from "@/src/ads/BottomBanner";
import { useStore } from "@/src/lib/store";
import { fonts, radius, spacing } from "@/src/lib/theme";

export default function Zikirlerim() {
  const {
    theme,
    allDhikrs,
    state,
    setActiveDhikr,
    deleteCustomDhikr,
  } = useStore();
  const insets = useSafeAreaInsets();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const pickAndGo = (id: string) => {
    setActiveDhikr(id);
    router.push("/(tabs)");
  };

  const pending = allDhikrs.find((d) => d.id === pendingDelete);

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.h1, { color: theme.text, fontFamily: fonts.display }]}>
          Zikirlerim
        </Text>

        {/* Namaz Sonrası Tesbihat card */}
        <Pressable
          onPress={() => router.push("/tesbihat")}
          style={styles.tesbihatCard}
          testID="tesbihat-card"
        >
          <LinearGradient
            colors={[theme.emeraldDeep, theme.emerald, theme.navy]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.tesbihatInner}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text
                style={[
                  styles.tesbihatTitle,
                  { color: theme.gold, fontFamily: fonts.display },
                ]}
              >
                Namaz Sonrası Tesbihat
              </Text>
              <Text style={[styles.tesbihatSub, { color: theme.text }]}>
                33 Sübhanallah · 33 Elhamdülillah · 33 Allahu Ekber
              </Text>
              <Text style={[styles.tesbihatHint, { color: theme.textMuted }]}>
                Otomatik geçişli, huzurlu bir tesbihat modu.
              </Text>
            </View>
            <View style={[styles.tesbihatIcon, { borderColor: theme.gold }]}>
              <Ionicons name="moon-outline" size={22} color={theme.gold} />
            </View>
          </View>
        </Pressable>

        {/* Esmaül Hüsna shortcut */}
        <Pressable
          onPress={() => router.push("/esma")}
          style={[
            styles.esmaCard,
            { backgroundColor: theme.bgCard, borderColor: theme.border },
          ]}
          testID="esma-card"
        >
          <View style={[styles.esmaBadge, { borderColor: theme.gold }]}>
            <Text style={{ color: theme.gold, fontWeight: "700" }}>99</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: theme.text,
                fontSize: 17,
                fontWeight: "600",
                fontFamily: fonts.display,
              }}
            >
              Esmaül Hüsna
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>
              Allah&apos;ın 99 ismi — Arapça, Türkçe okunuş ve kısa anlam.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
        </Pressable>

        <Text style={[styles.section, { color: theme.textMuted }]}>ZİKİR LİSTESİ</Text>

        <View style={{ gap: spacing.md }}>
          {allDhikrs.map((d) => {
            const s = state.dhikrStates[d.id];
            const active = state.activeDhikrId === d.id;
            return (
              <View
                key={d.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.bgCard,
                    borderColor: active ? theme.gold : theme.border,
                  },
                ]}
                testID={`zikir-card-${d.id}`}
              >
                <Pressable
                  style={styles.cardMain}
                  onPress={() => pickAndGo(d.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.cardName,
                        { color: theme.text, fontFamily: fonts.display },
                      ]}
                    >
                      {d.name}
                    </Text>
                    {"arabic" in d && d.arabic ? (
                      <Text style={[styles.cardArabic, { color: theme.textMuted }]}>
                        {d.arabic}
                      </Text>
                    ) : null}
                    <View style={styles.metaRow}>
                      <Text style={[styles.meta, { color: theme.gold }]}>
                        {s?.count || 0} / {s?.target || d.defaultTarget}
                      </Text>
                      {active ? (
                        <View
                          style={[
                            styles.activeBadge,
                            { borderColor: theme.gold, backgroundColor: theme.emeraldDeep },
                          ]}
                        >
                          <Text
                            style={{ color: theme.gold, fontSize: 11, fontWeight: "600" }}
                          >
                            Aktif
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="play-circle-outline" size={28} color={theme.gold} />
                </Pressable>
                {!d.builtin ? (
                  <View style={styles.customActions}>
                    <Pressable
                      onPress={() => router.push({ pathname: "/custom-dhikr", params: { id: d.id } })}
                      style={[styles.smallBtn, { borderColor: theme.border }]}
                      testID={`edit-${d.id}`}
                    >
                      <Ionicons name="create-outline" size={14} color={theme.textMuted} />
                      <Text style={{ color: theme.textMuted, fontSize: 12 }}>Düzenle</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setPendingDelete(d.id)}
                      style={[styles.smallBtn, { borderColor: theme.border }]}
                      testID={`delete-${d.id}`}
                    >
                      <Ionicons name="trash-outline" size={14} color={theme.danger} />
                      <Text style={{ color: theme.danger, fontSize: 12 }}>Sil</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <BottomBanner />
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/custom-dhikr")}
        style={[
          styles.fab,
          {
            bottom: insets.bottom + 78,
            backgroundColor: theme.gold,
            shadowColor: theme.gold,
          },
        ]}
        testID="add-dhikr-fab"
      >
        <Ionicons name="add" size={26} color={theme.bg} />
      </Pressable>

      <ConfirmSheet
        visible={!!pendingDelete}
        title="Zikri sil?"
        message={pending ? `"${pending.name}" zikri ve sayacı silinecek.` : undefined}
        confirmLabel="Sil"
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteCustomDhikr(pendingDelete);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
        theme={theme}
        testID="delete-confirm"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  h1: {
    fontSize: 34,
    fontWeight: "300",
    letterSpacing: 0.5,
  },
  section: {
    // BUG-011: textTransform kaldirildi, metin dogrudan Türkçe buyuk
    // harfle yazildi.
    fontSize: 12,
    letterSpacing: 1.5,
    marginTop: spacing.sm,
  },
  tesbihatCard: {
    borderRadius: radius.lg,
    overflow: "hidden",
    minHeight: 140,
    justifyContent: "center",
  },
  tesbihatInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  tesbihatTitle: {
    fontSize: 22,
    letterSpacing: 0.4,
  },
  tesbihatSub: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  tesbihatHint: {
    fontSize: 12,
    marginTop: 4,
  },
  tesbihatIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  esmaCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  esmaBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardName: {
    fontSize: 20,
    fontWeight: "500",
  },
  cardArabic: {
    fontSize: 15,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  meta: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  customActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.md,
  },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fab: {
    position: "absolute",
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
