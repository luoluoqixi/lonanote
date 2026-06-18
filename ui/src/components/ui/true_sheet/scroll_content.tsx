import { type ReactNode, forwardRef } from "react";
import {
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isIos26Plus, isLegacyCompactIphone, os } from "@/api/common/platform";

import { getTrueSheetScrollBottomPadding } from "./sheet_scroll_layout";
import { useTrueSheetScrollLayout } from "./true_sheet_scroll_context";

const SCROLLBAR_LEGACY_COMPACT_IPHONE_BOTTOM = 40;
const SCROLLBAR_IOS26_PLUS_VISUAL_OFFSET = 12;

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
export const TrueSheetScrollContent = forwardRef<ScrollView, TrueSheetScrollContentProps>(
  ({ children, contentContainerStyle, extraBottomPadding, style, ...rest }, ref) => {
    const insets = useSafeAreaInsets();
    const { automaticContentInsetAdjustment, insetAdjustment, nativeScrollInsetsApplied } =
      useTrueSheetScrollLayout();

    // Android：保持库钉住 ScrollView 时的原有 flexGrow 布局，不在此组件改滚动行为。
    if (os() === "android") {
      return (
        <ScrollView
          ref={ref}
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
     */
    const ios26PlusVisualOffset = isIos26Plus() ? SCROLLBAR_IOS26_PLUS_VISUAL_OFFSET : 0;
    const indicatorVisualAvoidanceInset =
      automaticContentInsetAdjustment && !nativeScrollInsetsApplied
        ? insets.bottom > 0
          ? insets.bottom + ios26PlusVisualOffset
          : isLegacyCompactIphone()
            ? SCROLLBAR_LEGACY_COMPACT_IPHONE_BOTTOM
            : 8
        : 0;
    const indicatorBottomInset = nativeScrollInsetsApplied
      ? 0
      : insets.bottom + indicatorVisualAvoidanceInset;

    return (
      <ScrollView
        ref={ref}
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
  },
);
TrueSheetScrollContent.displayName = "TrueSheetScrollContent";

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
