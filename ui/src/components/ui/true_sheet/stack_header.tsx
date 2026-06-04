import { Pressable, StyleSheet, Text } from "react-native";

import { useResolvedeColorScheme } from "@/hooks/settings";

import { useTrueSheetStackHost } from "./stack_context";

/** 原生 Stack `headerRight`：关闭当前 True Sheet（沿用 iOS 系统蓝色）。 */
export function TrueSheetStackHeaderCloseButton() {
  const colorScheme = useResolvedeColorScheme();
  const { onRequestClose } = useTrueSheetStackHost();
  const actionTint = colorScheme === "dark" ? "#0A84FF" : "#007AFF";

  return (
    <Pressable
      accessibilityLabel="关闭"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onRequestClose}
      style={styles.button}
    >
      <Text style={[styles.label, { color: actionTint }]}>关闭</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 17,
    fontWeight: "400",
  },
});
