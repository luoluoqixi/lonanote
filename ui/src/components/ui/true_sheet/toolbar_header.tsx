import { ChevronLeft } from "@tamagui/lucide-icons-2";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "tamagui";

import { Text } from "@/components/ui";

export type TrueSheetToolbarHeaderProps = {
  /** 是否显示返回箭头（子页为 true，根页为 false）。 */
  canGoBack?: boolean;
  headerRight?: ReactNode;
  onBack?: () => void;
  title: string;
};

/**
 * Android / 无 Native Stack 时的工具栏：左箭头 + 标题（对齐全屏 Expo Stack 样式，非居中三栏文字）。
 */
export function TrueSheetToolbarHeader({
  canGoBack = false,
  headerRight,
  onBack,
  title,
}: TrueSheetToolbarHeaderProps) {
  const theme = useTheme();
  const background = theme.background.val;
  const borderColor = theme.borderColor.val;
  const titleColor = theme.color.val;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: background,
          borderBottomColor: borderColor,
        },
      ]}
    >
      {canGoBack ? (
        <Pressable
          accessibilityLabel="返回"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={styles.backButton}
        >
          <ChevronLeft color="$color" size={28} strokeWidth={2} />
        </Pressable>
      ) : (
        <View style={styles.backPlaceholder} />
      )}
      <Text
        ellipsizeMode="tail"
        numberOfLines={1}
        style={[styles.title, { color: titleColor }, !canGoBack && styles.titleRoot]}
      >
        {title}
      </Text>
      {headerRight != null ? (
        <View style={styles.trailing}>{headerRight}</View>
      ) : (
        <View style={styles.trailingPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    marginStart: 4,
    width: 48,
  },
  backPlaceholder: {
    width: 16,
  },
  root: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 56,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "500",
    marginStart: -4,
  },
  titleRoot: {
    marginStart: 0,
    paddingStart: 16,
  },
  trailing: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    minWidth: 48,
    paddingEnd: 8,
  },
  trailingPlaceholder: {
    width: 16,
  },
});
