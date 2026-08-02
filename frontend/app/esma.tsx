// Esmaül Hüsna — 99 isim, arama, favoriler, isim başı sayaç.

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmSheet } from "@/src/components/ConfirmSheet";
import { ESMA_LIST, type EsmaEntry } from "@/src/lib/esma";
import { useStore } from "@/src/lib/store";
import { fonts, radius, spacing } from "@/src/lib/theme";

type Filter = "all" | "favorites";

export default function EsmaScreen() {
  const {
    theme,
    state,
    incEsma,
    resetEsma,
    toggleEsmaFavorite,
  } = useStore();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [detail, setDetail] = useState<EsmaEntry | null>(null);
  const [confirmResetNo, setConfirmResetNo] = useState<number | null>(null);

  const data = useMemo(() => {
    let list: EsmaEntry[] = ESMA_LIST;
    if (filter === "favorites") {
      list = list.filter((e) => state.esmaFavorites.includes(e.no));
    }
    const norm = (s: string) =>
      s
        .toLocaleLowerCase("tr")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/'/g, "");
    const q = norm(query.trim());
    if (q) {
      list = list.filter(
        (e) =>
          norm(e.turkish).includes(q) ||
          norm(e.meaning).includes(q) ||
          String(e.no).includes(q)
      );
    }
    return list;
  }, [filter, query, state.esmaFavorites]);

  const isFav = (no: number) => state.esmaFavorites.includes(no);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.md,
            borderBottomColor: theme.divider,
            backgroundColor: theme.bg,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.backBtn, { borderColor: theme.border }]}
            testID="esma-back"
          >
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text, fontFamily: fonts.display }]}>
            Esmaül Hüsna
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
          <Ionicons name="search" size={16} color={theme.textSubtle} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="İsim, anlam veya numara ara"
            placeholderTextColor={theme.textSubtle}
            style={{ color: theme.text, flex: 1, fontSize: 14 }}
            testID="esma-search"
          />
        </View>

        <View style={styles.chipsRow}>
          <FilterChip
            label="Tümü"
            active={filter === "all"}
            onPress={() => setFilter("all")}
            theme={theme}
            testID="esma-filter-all"
          />
          <FilterChip
            label={`Favoriler (${state.esmaFavorites.length})`}
            active={filter === "favorites"}
            onPress={() => setFilter("favorites")}
            theme={theme}
            testID="esma-fav-chip"
          />
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => String(item.no)}
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing["2xl"],
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
        }}
        ListEmptyComponent={
          <Text
            style={{
              color: theme.textSubtle,
              textAlign: "center",
              marginTop: spacing["2xl"],
            }}
          >
            Sonuç bulunamadı.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setDetail(item)}
            style={[
              styles.row,
              { backgroundColor: theme.bgCard, borderColor: theme.border },
            ]}
            testID={`esma-row-${item.no}`}
          >
            <View style={[styles.numBadge, { borderColor: theme.gold }]}>
              <Text style={{ color: theme.gold, fontWeight: "700" }}>{item.no}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.gold,
                  fontSize: 22,
                  fontFamily: fonts.display,
                  textAlign: "right",
                }}
              >
                {item.arabic}
              </Text>
              <Text
                style={{ color: theme.text, fontSize: 15, fontWeight: "600", marginTop: 4 }}
              >
                {item.turkish}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                {item.meaning}
              </Text>
            </View>
            <Pressable
              onPress={() => toggleEsmaFavorite(item.no)}
              hitSlop={10}
              testID={`esma-fav-${item.no}`}
            >
              <Ionicons
                name={isFav(item.no) ? "heart" : "heart-outline"}
                size={20}
                color={isFav(item.no) ? theme.gold : theme.textSubtle}
              />
            </Pressable>
          </Pressable>
        )}
      />

      {/* Detail modal */}
      {detail ? (
        <View style={[StyleSheet.absoluteFillObject, styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetail(null)} />
          <View
            style={[
              styles.sheet,
              { backgroundColor: theme.bgCard, borderColor: theme.border, paddingBottom: insets.bottom + spacing.lg },
            ]}
          >
            <View style={styles.sheetHead}>
              <View style={[styles.numBadge, { borderColor: theme.gold }]}>
                <Text style={{ color: theme.gold, fontWeight: "700" }}>{detail.no}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: "600" }}>
                  {detail.turkish}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                  {detail.meaning}
                </Text>
              </View>
              <Pressable onPress={() => setDetail(null)} hitSlop={10} testID="esma-detail-close">
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </Pressable>
            </View>
            <Text
              style={{
                color: theme.gold,
                fontSize: 44,
                fontFamily: fonts.display,
                textAlign: "center",
                marginTop: spacing.lg,
              }}
            >
              {detail.arabic}
            </Text>
            <Text
              style={{
                color: theme.text,
                fontSize: 96,
                fontFamily: fonts.display,
                fontWeight: "300",
                textAlign: "center",
                marginTop: spacing.md,
              }}
              testID="esma-detail-count"
            >
              {state.esmaCounters[detail.no] || 0}
            </Text>
            <Pressable
              onPress={() => {
                incEsma(detail.no);
                if (state.settings.vibration)
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.tapBigBtn, { backgroundColor: theme.gold }]}
              testID="esma-detail-tap"
            >
              <Ionicons name="add" size={20} color={theme.bg} />
              <Text style={{ color: theme.bg, fontSize: 16, fontWeight: "700", marginLeft: 6 }}>
                Sayacı Artır
              </Text>
            </Pressable>
            <View style={styles.smallRow}>
              <Pressable
                onPress={() => toggleEsmaFavorite(detail.no)}
                style={[styles.smallActionBtn, { borderColor: theme.border }]}
                testID="esma-detail-fav"
              >
                <Ionicons
                  name={isFav(detail.no) ? "heart" : "heart-outline"}
                  size={16}
                  color={isFav(detail.no) ? theme.gold : theme.textMuted}
                />
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                  {isFav(detail.no) ? "Favorilerden çıkar" : "Favorilere ekle"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setConfirmResetNo(detail.no)}
                style={[styles.smallActionBtn, { borderColor: theme.border }]}
                testID="esma-detail-reset"
              >
                <Ionicons name="refresh-outline" size={16} color={theme.textMuted} />
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>Sıfırla</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <ConfirmSheet
        visible={confirmResetNo !== null}
        title="İsim sayacı sıfırlansın mı?"
        confirmLabel="Sıfırla"
        destructive
        onConfirm={() => {
          if (confirmResetNo !== null) resetEsma(confirmResetNo);
          setConfirmResetNo(null);
        }}
        onCancel={() => setConfirmResetNo(null)}
        theme={theme}
        testID="esma-reset-confirm"
      />
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  theme,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: any;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? theme.gold : theme.border,
          backgroundColor: active ? theme.emeraldDeep : "transparent",
        },
      ]}
      testID={testID}
    >
      <Text
        style={{
          color: active ? theme.gold : theme.textMuted,
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    flexShrink: 0,
    height: 40,
    alignItems: "center",
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  numBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    justifyContent: "flex-end",
    zIndex: 20,
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: 4,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  tapBigBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
  },
  smallRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.md,
  },
  smallActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingVertical: 10,
  },
});
