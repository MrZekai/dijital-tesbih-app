// İstatistikler — günlük, haftalık, aylık, toplam ve seri (streak).
//
// v1.1.0: hafta günü adları `Intl` ile locale'den gelir (sabit "Pzt/Sal…"
// listesi kaldırıldı), sayılar locale biçiminde gösterilir, seri kartı
// eklendi ve tüm metinler çeviri anahtarlarına taşındı.

import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Text } from "@/src/components/AppText";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConfirmSheet } from "@/src/components/ConfirmSheet";
import { StatusBarScrim } from "@/src/components/StatusBarScrim";
import { useI18n } from "@/src/i18n";
import { formatWeekdayShort } from "@/src/i18n/format";
import { dhikrName } from "@/src/lib/dhikrs";
import { useBottomChromeHeight } from "@/src/lib/layout";
import { useDirection } from "@/src/lib/rtl";
import { useStore } from "@/src/lib/store";
import type { ThemeTokens } from "@/src/lib/theme";
import { fonts, radius, spacing } from "@/src/lib/theme";

export default function Istatistikler() {
  const {
    theme,
    state,
    allDhikrs,
    todayTotal,
    weeklyTotals,
    monthlyTotal,
    topDhikrs,
    streak,
    resetAllStats,
  } = useStore();
  const { t, n: fmt, bcp47 } = useI18n();
  const dir = useDirection();
  const bottomChrome = useBottomChromeHeight();
  const [confirmReset, setConfirmReset] = useState(false);

  const today = todayTotal();
  const week = weeklyTotals();
  const weekSum = week.reduce((s, x) => s + x.total, 0);
  const month = monthlyTotal();
  const maxWeek = Math.max(1, ...week.map((w) => w.total));
  const dailyGoal = state.settings.dailyGoal;
  const goalPercent = Math.min(
    100,
    Math.round((today / Math.max(1, dailyGoal)) * 100)
  );
  const top = topDhikrs(3);
  const { current: currentStreak, best: bestStreak } = streak();

  const nameOf = (id: string) => {
    const d = allDhikrs.find((x) => x.id === id);
    return d ? dhikrName(d, t) : id;
  };

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
      >
        <Text
          style={[
            styles.h1,
            { color: theme.text, fontFamily: fonts.display, textAlign: dir.textAlign },
          ]}
        >
          {t("stats.title")}
        </Text>

        {/* Günlük hedef kartı */}
        <View
          style={[
            styles.goalCard,
            { backgroundColor: theme.bgCard, borderColor: theme.border },
          ]}
          testID="daily-goal-card"
        >
          <View style={[styles.goalHeader, { flexDirection: dir.row }]}>
            <View>
              <Text
                style={[
                  styles.goalLabel,
                  { color: theme.textMuted, textAlign: dir.textAlign },
                ]}
              >
                {t("stats.today")}
              </Text>
              <Text
                style={[
                  styles.goalValue,
                  {
                    color: theme.gold,
                    fontFamily: fonts.display,
                    textAlign: dir.textAlign,
                  },
                ]}
              >
                {fmt(today)}
              </Text>
            </View>
            <View
              style={{ alignItems: dir.isRTL ? "flex-start" : "flex-end" }}
            >
              <Text style={[styles.goalLabel, { color: theme.textMuted }]}>
                {t("settings.section_goal")}
              </Text>
              <Text style={[styles.goalGoal, { color: theme.text }]}>
                {fmt(dailyGoal)}
              </Text>
            </View>
          </View>
          <View style={[styles.progressBg, { backgroundColor: theme.divider }]}>
            <View
              style={[
                styles.progressFg,
                { backgroundColor: theme.gold, width: `${goalPercent}%` },
              ]}
            />
          </View>
          <Text
            style={{
              color: theme.textSubtle,
              fontSize: 12,
              marginTop: 4,
              textAlign: dir.textAlign,
            }}
            testID="goal-progress-line"
          >
            {goalPercent >= 100
              ? t("stats.goal_reached")
              : t("stats.remaining", { count: Math.max(0, dailyGoal - today) })}
          </Text>
        </View>

        {/* Özet kutuları */}
        <View style={[styles.row, { flexDirection: dir.row }]}>
          <StatBox label={t("stats.weekly")} value={fmt(weekSum)} theme={theme} />
          <StatBox label={t("stats.monthly")} value={fmt(month)} theme={theme} />
          <StatBox
            label={t("stats.total")}
            value={fmt(state.totalCount)}
            theme={theme}
          />
        </View>

        {/* Seri (streak) */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.bgCard, borderColor: theme.border },
          ]}
          testID="streak-card"
        >
          <View style={[styles.row, { flexDirection: dir.row }]}>
            <StatBox
              label={t("stats.streak_current")}
              value={t("stats.days", { count: currentStreak })}
              theme={theme}
              small
            />
            <StatBox
              label={t("stats.streak_best")}
              value={t("stats.days", { count: bestStreak })}
              theme={theme}
              small
            />
          </View>
        </View>

        {/* Haftalık grafik */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.bgCard, borderColor: theme.border },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: theme.text, textAlign: dir.textAlign },
            ]}
          >
            {t("stats.weekly")}
          </Text>
          <View style={[styles.chart, { flexDirection: dir.row }]} testID="weekly-chart">
            {week.map((d) => {
              const day = new Date(`${d.date}T00:00:00`);
              const h = Math.max(4, (d.total / maxWeek) * 120);
              return (
                <View key={d.date} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: h,
                        backgroundColor: d.total > 0 ? theme.gold : theme.border,
                      },
                    ]}
                  />
                  <Text
                    style={{ color: theme.textSubtle, fontSize: 11 }}
                    numberOfLines={1}
                  >
                    {formatWeekdayShort(day, bcp47)}
                  </Text>
                  <Text style={{ color: theme.text, fontSize: 11 }}>
                    {fmt(d.total)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* En sık yapılan zikirler */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.bgCard, borderColor: theme.border },
          ]}
          testID="top-dhikrs-list"
        >
          <Text
            style={[
              styles.cardTitle,
              { color: theme.text, textAlign: dir.textAlign },
            ]}
          >
            {t("stats.top_dhikrs")}
          </Text>
          {top.filter((x) => x.count > 0).length === 0 ? (
            <Text
              style={{
                color: theme.textSubtle,
                fontSize: 13,
                textAlign: dir.textAlign,
              }}
            >
              {t("stats.no_data")}
            </Text>
          ) : (
            top.map((x, i) => (
              <View
                key={x.id}
                style={[styles.topRow, { flexDirection: dir.row }]}
              >
                <View
                  style={[
                    styles.topBadge,
                    { borderColor: theme.gold, backgroundColor: theme.emeraldDeep },
                  ]}
                >
                  <Text style={{ color: theme.gold, fontWeight: "700" }}>
                    {fmt(i + 1)}
                  </Text>
                </View>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 15,
                    flex: 1,
                    textAlign: dir.textAlign,
                  }}
                  numberOfLines={2}
                >
                  {nameOf(x.id)}
                </Text>
                <Text
                  style={{ color: theme.gold, fontSize: 15, fontWeight: "600" }}
                >
                  {fmt(x.count)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Tümünü sıfırla */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.bgCard, borderColor: theme.border },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: theme.text, textAlign: dir.textAlign },
            ]}
          >
            {t("stats.reset_all")}
          </Text>
          <Text
            style={{
              color: theme.textMuted,
              fontSize: 13,
              marginBottom: 12,
              textAlign: dir.textAlign,
              writingDirection: dir.writingDirection,
            }}
          >
            {t("stats.reset_all_message")}
          </Text>
          <View style={{ flexDirection: dir.row }}>
            <Pressable
              onPress={() => setConfirmReset(true)}
              style={({ pressed }) => ({
                borderRadius: radius.pill,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.danger,
                paddingHorizontal: spacing.lg,
                paddingVertical: 10,
                opacity: pressed ? 0.6 : 1,
              })}
              testID="reset-all-btn"
              accessibilityRole="button"
              accessibilityLabel={t("stats.reset_all")}
            >
              <Text
                style={{ color: theme.danger, fontSize: 13, fontWeight: "600" }}
              >
                {t("common.reset")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={confirmReset}
        title={t("stats.reset_all_title")}
        message={t("stats.reset_all_message")}
        confirmLabel={t("common.reset")}
        destructive
        onConfirm={() => {
          resetAllStats();
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
        theme={theme}
        testID="reset-all-confirm"
      />
    </SafeAreaView>
  );
}

function StatBox({
  label,
  value,
  theme,
  small,
}: {
  label: string;
  value: string;
  theme: ThemeTokens;
  small?: boolean;
}) {
  return (
    <View
      style={[
        styles.statBox,
        { backgroundColor: theme.bgCard, borderColor: theme.border },
      ]}
    >
      <Text style={{ color: theme.textSubtle, fontSize: 12 }} numberOfLines={2}>
        {label}
      </Text>
      <Text
        style={{
          color: theme.gold,
          fontSize: small ? 18 : 24,
          fontWeight: "600",
          fontFamily: fonts.display,
          marginTop: 2,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
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
  goalCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    gap: 10,
  },
  goalHeader: {
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  goalLabel: {
    fontSize: 12,
    letterSpacing: 1,
  },
  goalValue: {
    fontSize: 42,
    fontWeight: "300",
    marginTop: 2,
  },
  goalGoal: {
    fontSize: 22,
    fontWeight: "500",
    marginTop: 2,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  progressFg: {
    height: "100%",
    borderRadius: 3,
  },
  row: {
    gap: spacing.md,
  },
  statBox: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  chart: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 160,
    marginTop: spacing.md,
  },
  barCol: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  bar: {
    width: 18,
    borderRadius: 3,
  },
  topRow: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 6,
  },
  topBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
