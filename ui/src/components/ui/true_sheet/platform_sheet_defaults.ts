import type { TrueSheetProps } from "@lodev09/react-native-true-sheet";
import { Platform, type StyleProp, type ViewStyle } from "react-native";

const scrollableWithPinnedScroll = {
  scrollable: true,
  scrollableOptions: {
    scrollingExpandsSheet: false,
  },
} as const satisfies Pick<TrueSheetProps, "scrollable" | "scrollableOptions">;

/** `TrueSheetPanel`：Android / iOS 均需 `scrollable` 撑开内容区（含 `header` 槽 + 工具栏）。 */
export function getTrueSheetPanelScrollableProps(): Pick<
  TrueSheetProps,
  "scrollable" | "scrollableOptions"
> {
  return scrollableWithPinnedScroll;
}

/**
 * iOS `TrueSheetStackHost`：须 `scrollable` 才能撑开内容区（含 Native Stack 标题栏）。
 * 内层滚动仍由 `TrueSheetScrollContent` 处理。
 */
export function getTrueSheetStackHostScrollableProps(): Pick<
  TrueSheetProps,
  "scrollable" | "scrollableOptions"
> {
  return scrollableWithPinnedScroll;
}

/** `scrollable={false}` 时 iOS 内容区不会自动 flex:1，需显式补上否则白屏。 */
export function mergeTrueSheetContentStyle(
  scrollable: boolean | undefined,
  style?: StyleProp<ViewStyle>,
): StyleProp<ViewStyle> {
  if (Platform.OS !== "ios" || scrollable === true) {
    return style;
  }

  const flexFill = { flex: 1 } as const;
  return style != null ? [style, flexFill] : flexFill;
}

export function shouldUseTrueSheetNativeScrollInsets(scrollable: boolean | undefined): boolean {
  return Platform.OS === "android" && scrollable === true;
}

/** Sheet 内容区根节点样式：Android 与库 `scrollable` 配合用 `flexGrow`。 */
export function getTrueSheetGestureRootStyle() {
  if (Platform.OS === "android") {
    return { flexGrow: 1 as const };
  }

  return { flex: 1 as const, minHeight: 0 as const };
}
