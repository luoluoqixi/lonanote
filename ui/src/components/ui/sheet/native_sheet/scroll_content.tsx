import { type ReactNode, forwardRef } from "react";
import {
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { os } from "@/api/common/platform";

import { AndroidClippedScrollView } from "./true_sheet/android_clipped_scroll_view";
import {
  getTrueSheetScrollBottomPadding,
  getTrueSheetScrollIndicatorBottomInset,
} from "./true_sheet/sheet_scroll_layout";
import { useTrueSheetScrollLayout } from "./true_sheet/true_sheet_scroll_context";

export type NativeSheetScrollContentProps = Omit<ScrollViewProps, "children"> & {
  children: ReactNode;
  /** 追加在底部安全区与默认留白之后 */
  extraBottomPadding?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * NativeSheet 内滚动容器：
 * - iOS TrueSheet 子树下复用现有 inset / detent 补偿
 * - Android TrueSheet 下使用裁剪滚动容器，避免滚动内容溢出圆角区域
 */
export const NativeSheetScrollContent = forwardRef<ScrollView, NativeSheetScrollContentProps>(
  ({ children, contentContainerStyle, extraBottomPadding, style, ...rest }, ref) => {
    const insets = useSafeAreaInsets();
    const { automaticContentInsetAdjustment, insetAdjustment, nativeScrollInsetsApplied } =
      useTrueSheetScrollLayout();

    if (os() === "android") {
      return (
        <AndroidClippedScrollView
          ref={ref}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator
          style={[styles.androidScroll, style]}
          contentContainerStyle={[styles.androidContent, contentContainerStyle]}
          {...rest}
        >
          {children}
        </AndroidClippedScrollView>
      );
    }

    const bottomPadding = getTrueSheetScrollBottomPadding({
      extraBottom: extraBottomPadding,
      insetAdjustment,
      nativeScrollInsetsApplied,
      safeAreaBottom: insets.bottom,
    });
    const indicatorBottomInset = getTrueSheetScrollIndicatorBottomInset({
      automaticContentInsetAdjustment,
      nativeScrollInsetsApplied,
      safeAreaBottom: insets.bottom,
    });

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
NativeSheetScrollContent.displayName = "NativeSheetScrollContent";

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
