import type { InsetAdjustment } from "@lodev09/react-native-true-sheet";

/** True Sheet 滚动内容尾部留白（不含安全区）。 */
export const TRUE_SHEET_SCROLL_EXTRA_BOTTOM_PADDING = 24;

export type TrueSheetScrollBottomPaddingOptions = {
  extraBottom?: number;
  insetAdjustment?: InsetAdjustment;
  /** `scrollable` 且已被库钉住并注入 contentInset 时为 true */
  nativeScrollInsetsApplied?: boolean;
  safeAreaBottom?: number;
};

/**
 * 计算 ScrollView `contentContainerStyle.paddingBottom`。
 * `insetAdjustment="automatic"` 且未由库注入 inset 时，仍需把内容滚出底部安全区垫高区域。
 */
export function getTrueSheetScrollBottomPadding({
  extraBottom = TRUE_SHEET_SCROLL_EXTRA_BOTTOM_PADDING,
  insetAdjustment = "automatic",
  nativeScrollInsetsApplied = false,
  safeAreaBottom = 0,
}: TrueSheetScrollBottomPaddingOptions = {}): number {
  if (nativeScrollInsetsApplied) {
    return extraBottom;
  }

  if (insetAdjustment === "never") {
    return Math.max(safeAreaBottom, 0) + extraBottom;
  }

  return Math.max(safeAreaBottom, 0) + extraBottom;
}
