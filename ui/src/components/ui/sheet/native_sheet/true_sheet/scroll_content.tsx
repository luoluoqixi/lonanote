import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
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
import { useBottomSheetScrollableContext } from "@/components/ui/sheet/native_sheet/bottom_sheet/scrollable_context";

import { AndroidClippedScrollView } from "./android_clipped_scroll_view";
import {
  getTrueSheetScrollBottomPadding,
  getTrueSheetScrollIndicatorBottomInset,
} from "./sheet_scroll_layout";
import { useTrueSheetScrollLayout } from "./true_sheet_scroll_context";

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
    const insideBottomSheetScrollable = useBottomSheetScrollableContext();
    const { automaticContentInsetAdjustment, insetAdjustment, nativeScrollInsetsApplied } =
      useTrueSheetScrollLayout();

    if (os() === "android" && insideBottomSheetScrollable) {
      return (
        <BottomSheetScrollView
          ref={ref as any}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator
          style={[styles.androidScroll, style]}
          contentContainerStyle={[styles.androidContent, contentContainerStyle]}
          {...(rest as any)}
        >
          {children}
        </BottomSheetScrollView>
      );
    }

    // Android：保持库钉住 ScrollView 时的原有 flexGrow 布局，不在此组件改滚动行为。
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
