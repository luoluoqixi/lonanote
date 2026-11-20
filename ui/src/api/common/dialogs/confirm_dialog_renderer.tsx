import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "rn-ui-kit";

import type { DialogRendererProps } from "./dialog_content_registry";

type ButtonOption = { key: string; text: string; style?: "cancel" | "destructive" | "default" };
type ConfirmPayload = { title: string; message: string; buttons: ButtonOption[] };

export function ConfirmDialogRenderer({ payload, onComplete }: DialogRendererProps) {
  const value = payload as ConfirmPayload;
  const buttons = useMemo(
    () => value.buttons.filter((button) => button.key && button.text),
    [value],
  );
  return (
    <View style={styles.root}>
      <View style={styles.copy}>
        <Text style={styles.title}>{value.title}</Text>
        <Text>{value.message}</Text>
      </View>
      <View style={styles.actions}>
        {buttons.map((button) => (
          <Button
            key={button.key}
            variant={button.style === "destructive" ? "destructive" : "default"}
            onPress={() => onComplete(button.key)}
          >
            {button.text}
          </Button>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "space-between", padding: 24, gap: 24 },
  copy: { gap: 12 },
  title: { fontSize: 18, fontWeight: "600" },
  actions: { flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 8 },
});
