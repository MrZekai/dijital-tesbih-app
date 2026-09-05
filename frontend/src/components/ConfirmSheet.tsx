// Basit onaylı sıfırlama & benzeri kararlar için sade modal.

import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/src/components/AppText";
import { useT } from "@/src/i18n";
import { useDirection } from "@/src/lib/rtl";

import { spacing, radius } from "@/src/lib/theme";
import type { ThemeTokens } from "@/src/lib/theme";

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  theme: ThemeTokens;
  testID?: string;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
  theme,
  testID,
}: Props) {
  const t = useT();
  const dir = useDirection();
  const confirmText = confirmLabel ?? t("common.confirm");
  const cancelText = cancelLabel ?? t("common.cancel");
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.overlay }]}
        onPress={onCancel}
        testID={testID ? `${testID}-backdrop` : undefined}
      >
        <Pressable
          onPress={() => {}}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
            },
          ]}
          testID={testID}
        >
          <Text
            style={[styles.title, { color: theme.text, textAlign: dir.textAlign }]}
          >
            {title}
          </Text>
          {message ? (
            <Text
              style={[
                styles.message,
                {
                  color: theme.textMuted,
                  textAlign: dir.textAlign,
                  writingDirection: dir.writingDirection,
                },
              ]}
            >
              {message}
            </Text>
          ) : null}
          <View style={[styles.row, { flexDirection: dir.row }]}>
            <Pressable
              onPress={onCancel}
              style={[
                styles.btn,
                styles.btnGhost,
                { borderColor: theme.border },
              ]}
              testID={testID ? `${testID}-cancel` : undefined}
            >
              <Text style={[styles.btnText, { color: theme.textMuted }]}>
                {cancelText}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[
                styles.btn,
                {
                  backgroundColor: destructive ? theme.danger : theme.gold,
                },
              ]}
              testID={testID ? `${testID}-confirm` : undefined}
            >
              <Text
                style={[
                  styles.btnText,
                  {
                    color: destructive ? theme.text : theme.bg,
                    fontWeight: "700",
                  },
                ]}
              >
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  btnGhost: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnText: {
    fontSize: 15,
  },
});
