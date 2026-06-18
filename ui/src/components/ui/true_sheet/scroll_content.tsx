import type { ReactNode } from "react";
import {
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isLegacyCompactIphone, os } from "@/api/common/platform";

import { getTrueSheetScrollBottomPadding } from "./sheet_scroll_layout";
import { useTrueSheetScrollLayout } from "./true_sheet_scroll_context";

const SCROLLBAR_LEGACY_COMPACT_IPHONE_BOTTOM = 40;

export type TrueSheetScrollContentProps = Omit<ScrollViewProps, "children"> & {
  children: ReactNode;
  /** 追加在底部安全区与默认留白之后 */
  extraBottomPadding?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * True Sheet 内滚动容器：约束 flex、避免 `flexGrow: 1` 占满导致 iOS 滚不到底。
 * 须置于 `TrueSheetScrollLayoutProvider` 子树内（由 `TrueSheetPanel` / `TrueSheetStackHost` 提供）。
 */
export function TrueSheetScrollContent({
  children,
  contentContainerStyle,
  extraBottomPadding,
  style,
  ...rest
}: TrueSheetScrollContentProps) {
  const insets = useSafeAreaInsets();
  const { automaticContentInsetAdjustment, insetAdjustment, nativeScrollInsetsApplied } =
    useTrueSheetScrollLayout();

  // Android：保持库钉住 ScrollView 时的原有 flexGrow 布局，不在此组件改滚动行为。
  if (os() === "android") {
    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator
        style={[styles.androidScroll, style]}
        contentContainerStyle={[styles.androidContent, contentContainerStyle]}
        {...rest}
      >
        {children}
      </ScrollView>
    );
  }

  const bottomPadding = getTrueSheetScrollBottomPadding({
    extraBottom: extraBottomPadding,
    insetAdjustment,
    nativeScrollInsetsApplied,
    safeAreaBottom: insets.bottom,
  });
  /**
   * iOS `TrueSheetStackHost` + 透明原生 header 场景下，滚动条即使已被原生 patch 拉回到底部安全区附近，
   * 视觉终点仍会比普通页面更低一些，像是少了一层系统级的 indicator 避让。
   *
   * - 已确认真正稳定的主变量是 `safeAreaInsets.bottom`
   * - 不同 iPhone 的底部手势区 / 圆角区域不同，应直接跟随 safe area 变化
   * - iOS 26+ 的新设备上，系统滚动条视觉终点会比 iOS 18 略低一点，这里再叠一个很小的版本偏移
   * - iPhone 6s / 6s Plus / SE 1st gen 这类旧机型在 iOS 15 下仅靠 `safeAreaInsets.bottom`
   *   不足以把滚动条抬到和普通页面接近的位置，需要额外定值补偿
   * - 其它没有 Home indicator 的老设备先保留一个较小兜底值
   */
  const indicatorVisualAvoidanceInset =
    automaticContentInsetAdjustment && !nativeScrollInsetsApplied
      ? insets.bottom > 0
        ? insets.bottom
        : isLegacyCompactIphone()
          ? SCROLLBAR_LEGACY_COMPACT_IPHONE_BOTTOM
          : 8
      : 0;
  const indicatorBottomInset = nativeScrollInsetsApplied
    ? 0
    : insets.bottom + indicatorVisualAvoidanceInset;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator
      style={[styles.iosScroll, style]}
      contentContainerStyle={[
        styles.iosContent,
        { paddingBottom: bottomPadding },
        contentContainerStyle,
      ]}
      scrollIndicatorInsets={{
        bottom: indicatorBottomInset,
      }}
      contentInsetAdjustmentBehavior={automaticContentInsetAdjustment ? "automatic" : "never"}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  androidContent: {
    flexGrow: 1,
  },
  androidScroll: {
    flexGrow: 1,
  },
  iosContent: {
    flexGrow: 0,
  },
  iosScroll: {
    flex: 1,
    minHeight: 0,
  },
});
