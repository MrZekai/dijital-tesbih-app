// Zikirlerim — arama, filtre (tümü / favoriler / özel), favoriler ve son
// kullanılanlar bölümleri, Namaz Sonrası Tesbihat ve Esmaül Hüsna kartları.
//
// v1.1.0: tam i18n + RTL, favori yıldızı, arama/filtreleme, "son
// kullanılanlar" bölümü. Aktif zikir artık metin rozet yerine ikonla
// gösterilir — böylece hiçbir dilde taşma yaşanmaz.

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Text, TextInput } from "@/src/components/AppText";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConfirmSheet } from "@/src/components/ConfirmSheet";
import { StatusBarScrim } from "@/src/components/StatusBarScrim";
import { useI18n } from "@/src/i18n";
import { normalizeForSearch } from "@/src/i18n/format";
import { dhikrArabic, dhikrName, type AnyDhikr } from "@/src/lib/dhikrs";
import { useBottomChromeHeight } from "@/src/lib/layout";
import { useDirection } from "@/src/lib/rtl";
import { useStore } from "@/src/lib/store";
import { fonts, radius, spacing } from "@/src/lib/theme";

type Filter = "all" | "favorites" | "custom";

export default function Zikirlerim() {
  const {
    theme,
    allDhikrs,
    state,
    setActiveDhikr,
    deleteCustomDhikr,
    toggleFavoriteDhikr,
  } = useStore();
  const { t, n: fmt, bcp47 } = useI18n();
  const dir = useDirection();
  const bottomChrome = useBottomChromeHeight();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Referans kararlılığı: `|| []` her render'da YENİ dizi üretirdi ve
  // aşağıdaki useMemo boşuna yeniden çalışırdı.
  const favorites = useMemo(
    () => state.favoriteDhikrIds || [],
    [state.favoriteDhikrIds]
  );
  const recents = useMemo(
    () => state.recentDhikrIds || [],
    [state.recentDhikrIds]
  );

  const pickAndGo = (id: string) => {
    setActiveDhikr(id);
    router.push("/(tabs)");
  };

  const pending = allDhikrs.find((d) => d.id === pendingDelete);

  const matches = useMemo(() => {
    const q = normalizeForSearch(query, bcp47);
    return allDhikrs.filter((d) => {
      if (filter === "favorites" && !favorites.includes(d.id)) return false;
      if (filter === "custom" && d.builtin) return false;
      if (!q) return true;
      const name = normalizeForSearch(dhikrName(d, t), bcp47);
      const ar = normalizeForSearch(dhikrArabic(d) ?? "", bcp47);
      return name.includes(q) || ar.includes(q);
    });
  }, [allDhikrs, bcp47, favorites, filter, query, t]);

  const searching = query.trim().length > 0 || filter !== "all";

  const favoriteItems = matches.filter((d) => favorites.includes(d.id));
  const recentItems = recents
    .map((id) => matches.find((d) => d.id === id))
    .filter((d): d is AnyDhikr => !!d && !favorites.includes(d.id))
    .slice(0, 5);
  const restItems = matches.filter(
    (d) => !favorites.includes(d.id) && !recentItems.some((r) => r.id === d.id)
  );

  const renderCard = (d: AnyDhikr) => {
    const s = state.dhikrStates[d.id];
    const active = state.activeDhikrId === d.id;
    const fav = favorites.includes(d.id);
    const ar = dhikrArabic(d);
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
          style={[styles.cardMain, { flexDirection: dir.row }]}
          onPress={() => pickAndGo(d.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
        >
          <Pressable
            onPress={() => toggleFavoriteDhikr(d.id)}
            hitSlop={10}
            testID={`fav-${d.id}`}
            accessibilityRole="button"
            accessibilityLabel={
              fav ? t("mydhikrs.remove_favorite") : t("mydhikrs.add_favorite")
            }
          >
            <Ionicons
              name={fav ? "star" : "star-outline"}
              size={20}
              color={fav ? theme.gold : theme.textSubtle}
            />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.cardName,
                {
                  color: theme.text,
                  fontFamily: fonts.display,
                  textAlign: dir.textAlign,
                },
              ]}
            >
              {dhikrName(d, t)}
            </Text>
            {ar ? (
              <Text
                style={[
                  styles.cardArabic,
                  {
                    color: theme.textMuted,
                    textAlign: dir.textAlign,
                    writingDirection: "rtl",
                  },
                ]}
              >
                {ar}
              </Text>
            ) : null}
            <View style={[styles.metaRow, { flexDirection: dir.row }]}>
              <Text style={[styles.meta, { color: theme.gold }]}>
                {fmt(s?.count || 0)} / {fmt(s?.target || d.defaultTarget)}
              </Text>
              {active ? (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={theme.gold}
                  accessibilityLabel={t("common.done")}
                />
              ) : null}
            </View>
          </View>
          <Ionicons name="play-circle-outline" size={28} color={theme.gold} />
        </Pressable>
        {!d.builtin ? (
          <View style={[styles.customActions, { flexDirection: dir.row }]}>
            <Pressable
              onPress={() =>
                router.push({ pathname: "/custom-dhikr", params: { id: d.id } })
              }
              style={[
                styles.smallBtn,
                { borderColor: theme.border, flexDirection: dir.row },
              ]}
              testID={`edit-${d.id}`}
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={14} color={theme.textMuted} />
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                {t("common.edit")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPendingDelete(d.id)}
              style={[
                styles.smallBtn,
                { borderColor: theme.border, flexDirection: dir.row },
              ]}
              testID={`delete-${d.id}`}
              accessibilityRole="button"
            >
              <Ionicons name="trash-outline" size={14} color={theme.danger} />
              <Text style={{ color: theme.danger, fontSize: 12 }}>
                {t("common.delete")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  const sectionTitle = (label: string) => (
    <Text
      style={[
        styles.section,
        { color: theme.textMuted, textAlign: dir.textAlign },
      ]}
    >
      {label}
    </Text>
  );

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
          {t("mydhikrs.title")}
        </Text>

        {/* Namaz Sonrası Tesbihat */}
        <Pressable
          onPress={() => router.push("/tesbihat")}
          style={styles.tesbihatCard}
          testID="tesbihat-card"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[theme.emeraldDeep, theme.emerald, theme.navy]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.tesbihatInner, { flexDirection: dir.row }]}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text
                style={[
                  styles.tesbihatTitle,
                  {
                    color: theme.gold,
                    fontFamily: fonts.display,
                    textAlign: dir.textAlign,
                  },
                ]}
              >
                {t("tesbihat.title")}
              </Text>
              <Text
                style={[
                  styles.tesbihatSub,
                  { color: theme.text, textAlign: dir.textAlign },
                ]}
              >
                {t("tesbihat.subtitle")}
              </Text>
            </View>
            <View style={[styles.tesbihatIcon, { borderColor: theme.gold }]}>
              <Ionicons name="moon-outline" size={22} color={theme.gold} />
            </View>
          </View>
        </Pressable>

        {/* Esmaül Hüsna */}
        <Pressable
          onPress={() => router.push("/esma")}
          style={[
            styles.esmaCard,
            {
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
              flexDirection: dir.row,
            },
          ]}
          testID="esma-card"
          accessibilityRole="button"
        >
          <View style={[styles.esmaBadge, { borderColor: theme.gold }]}>
            <Text style={{ color: theme.gold, fontWeight: "700" }}>
              {fmt(99)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: theme.text,
                fontSize: 17,
                fontWeight: "600",
                fontFamily: fonts.display,
                textAlign: dir.textAlign,
              }}
            >
              {t("mydhikrs.esma_link")}
            </Text>
          </View>
          <Ionicons name={dir.forwardIcon} size={20} color={theme.textSubtle} />
        </Pressable>

        {/* Arama + filtreler */}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("mydhikrs.search_placeholder")}
          placeholderTextColor={theme.textSubtle}
          style={[
            styles.search,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.bgCard,
              textAlign: dir.textAlign,
              writingDirection: dir.writingDirection,
            },
          ]}
          testID="dhikr-search"
          accessibilityLabel={t("mydhikrs.search_placeholder")}
        />

        <View style={[styles.filterRow, { flexDirection: dir.row }]}>
          {(
            [
              ["all", t("mydhikrs.filter_all")],
              ["favorites", t("mydhikrs.filter_favorites")],
              ["custom", t("mydhikrs.filter_custom")],
            ] as [Filter, string][]
          ).map(([key, label]) => {
            const on = filter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: on ? theme.gold : theme.border,
                    backgroundColor: on ? theme.emeraldDeep : "transparent",
                  },
                ]}
                testID={`filter-${key}`}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text
                  style={{
                    color: on ? theme.gold : theme.textMuted,
                    fontSize: 13,
                    fontWeight: on ? "700" : "500",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {matches.length === 0 ? (
          <Text
            style={{
              color: theme.textSubtle,
              fontSize: 14,
              textAlign: dir.textAlign,
              paddingVertical: spacing.lg,
            }}
            testID="dhikr-empty"
          >
            {t("mydhikrs.no_results")}
          </Text>
        ) : null}

        {favoriteItems.length > 0 ? (
          <>
            {sectionTitle(t("mydhikrs.section_favorites"))}
            <View style={{ gap: spacing.md }}>{favoriteItems.map(renderCard)}</View>
          </>
        ) : null}

        {!searching && recentItems.length > 0 ? (
          <>
            {sectionTitle(t("mydhikrs.section_recent"))}
            <View style={{ gap: spacing.md }}>{recentItems.map(renderCard)}</View>
          </>
        ) : null}

        {restItems.length > 0 ? (
          <>
            {sectionTitle(
              filter === "custom"
                ? t("mydhikrs.section_custom")
                : t("mydhikrs.section_builtin")
            )}
            <View style={{ gap: spacing.md }}>
              {(searching ? restItems : restItems.filter((d) => d.builtin)).map(
                renderCard
              )}
            </View>
          </>
        ) : null}

        {!searching && restItems.some((d) => !d.builtin) ? (
          <>
            {sectionTitle(t("mydhikrs.section_custom"))}
            <View style={{ gap: spacing.md }}>
              {restItems.filter((d) => !d.builtin).map(renderCard)}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* FAB — reklam alanının ÜSTÜNDE durur (yanlış tıklama riski yok). */}
      <Pressable
        onPress={() => router.push("/custom-dhikr")}
        style={[
          styles.fab,
          {
            bottom: bottomChrome + spacing.md,
            [dir.end]: spacing.xl,
            backgroundColor: theme.gold,
            shadowColor: theme.gold,
          },
        ]}
        testID="add-dhikr-fab"
        accessibilityRole="button"
        accessibilityLabel={t("mydhikrs.add_custom")}
      >
        <Ionicons name="add" size={26} color={theme.bg} />
      </Pressable>

      <ConfirmSheet
        visible={!!pendingDelete}
        title={t("mydhikrs.delete_title")}
        message={
          pending
            ? t("mydhikrs.delete_message", { name: dhikrName(pending, t) })
            : undefined
        }
        confirmLabel={t("common.delete")}
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
    fontSize: 12,
    letterSpacing: 1.5,
    marginTop: spacing.sm,
  },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
  },
  filterRow: {
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tesbihatCard: {
    borderRadius: radius.lg,
    overflow: "hidden",
    minHeight: 130,
    justifyContent: "center",
  },
  tesbihatInner: {
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
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  meta: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  customActions: {
    gap: 8,
    marginTop: spacing.md,
  },
  smallBtn: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fab: {
    position: "absolute",
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
