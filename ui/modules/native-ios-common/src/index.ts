import { requireNativeViewManager } from "expo-modules-core";
import { type ComponentType, createElement } from "react";
import { View } from "react-native";

import type { VariableBlurViewProps } from "./types";

export type { VariableBlurDirection, VariableBlurViewProps } from "./types";

/**
 * 原生 View 不可用时的透明占位实现，避免业务组件重复判断模块注册状态。
 */
const VariableBlurViewFallback: ComponentType<VariableBlurViewProps> = function VariableBlurView({
  blurRadius: _blurRadius,
  direction: _direction,
  transitionHeight: _transitionHeight,
  ...props
}) {
  return createElement(View, props);
};

type ExpoGlobalWithViewConfig = typeof globalThis & {
  expo?: {
    getViewConfig?: (
      moduleName: string,
      viewName?: string,
    ) => {
      validAttributes: Record<string, unknown>;
      directEventTypes: Record<string, unknown>;
    } | null;
  };
};

function resolveVariableBlurView(): ComponentType<VariableBlurViewProps> {
  try {
    const nativeViewConfig = (globalThis as ExpoGlobalWithViewConfig).expo?.getViewConfig?.(
      "NativeIosCommon",
      "VariableBlurView",
    );
    if (!nativeViewConfig) return VariableBlurViewFallback;

    return requireNativeViewManager<VariableBlurViewProps>(
      "NativeIosCommon",
      "VariableBlurView",
    ) as ComponentType<VariableBlurViewProps>;
  } catch {
    return VariableBlurViewFallback;
  }
}

export const VariableBlurView = resolveVariableBlurView();
