import React from "react";

export const ParentSheetContext = React.createContext({
  zIndex: 100_000,
});

export type InnerSheetState = {
  // 内层 Sheet 是否仍在可见生命周期内。
  // 这里不仅包含 open=true，也包含关闭动画尚未结束的阶段，
  // 父层需要继续保持隐藏，否则视觉上会像子层“瞬间消失”。
  hasVisibleChild: boolean;
  // 父层是否需要继续禁用拖拽。
  // 这个状态与 hasVisibleChild 分开，避免“视觉隐藏”和“手势锁定”
  // 绑成同一个布尔值，导致动画和交互互相打断。
  shouldLockParentDrag: boolean;
};

// eslint-disable-next-line no-spaced-func
export const SheetInsideSheetContext = React.createContext<
  ((state: InnerSheetState) => void) | null
>(null);
