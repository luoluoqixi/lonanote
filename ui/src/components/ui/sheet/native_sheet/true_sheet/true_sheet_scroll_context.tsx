import type { InsetAdjustment } from "@lodev09/react-native-true-sheet";
import { type ReactNode, createContext, useContext, useMemo } from "react";

export type TrueSheetScrollLayoutConfig = {
  active: boolean;
  insetAdjustment: InsetAdjustment;
  /**
   * 是否让 ScrollView 使用 iOS 原生 `contentInsetAdjustmentBehavior="automatic"`。
   * 主要用于透明 header 场景修正顶部 inset。
   */
  automaticContentInsetAdjustment: boolean;
  /**
   * 库是否已对子树 ScrollView 注入底部 contentInset（须 `scrollable` 且视图层级 ≤2）。
   * Portal / Stack 等深层结构下设为 false，由 `TrueSheetScrollContent` 自行 padding。
   */
  nativeScrollInsetsApplied: boolean;
};

const TrueSheetScrollLayoutContext = createContext<TrueSheetScrollLayoutConfig | null>(null);

export function TrueSheetScrollLayoutProvider({
  automaticContentInsetAdjustment = false,
  children,
  insetAdjustment = "automatic",
  nativeScrollInsetsApplied = false,
}: {
  automaticContentInsetAdjustment?: boolean;
  children: ReactNode;
  insetAdjustment?: InsetAdjustment;
  nativeScrollInsetsApplied?: boolean;
}) {
  const value = useMemo(
    () => ({
      active: true,
      automaticContentInsetAdjustment,
      insetAdjustment,
      nativeScrollInsetsApplied,
    }),
    [automaticContentInsetAdjustment, insetAdjustment, nativeScrollInsetsApplied],
  );

  return (
    <TrueSheetScrollLayoutContext.Provider value={value}>
      {children}
    </TrueSheetScrollLayoutContext.Provider>
  );
}

export function useTrueSheetScrollLayout(): TrueSheetScrollLayoutConfig {
  return (
    useContext(TrueSheetScrollLayoutContext) ?? {
      active: false,
      automaticContentInsetAdjustment: false,
      insetAdjustment: "automatic",
      nativeScrollInsetsApplied: false,
    }
  );
}
