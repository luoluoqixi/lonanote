import { requireNativeViewManager } from "expo-modules-core";
import type { ComponentType } from "react";
import { StyleSheet, View } from "react-native";
import type { ViewProps } from "react-native";

import { os } from "@/api/common/platform";

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

export type VariableBlurDirection = "topToBottom" | "bottomToTop";

export type VariableBlurViewProps = ViewProps & {
  blurRadius?: number;
  direction?: VariableBlurDirection;
  transitionHeight?: number;
};

const VariableBlurViewFallback: ComponentType<VariableBlurViewProps> =
  function VariableBlurViewFallback({ style, ...props }) {
    return <View {...props} style={[styles.fallback, style]} />;
  };

function resolveVariableBlurView(): ComponentType<VariableBlurViewProps> {
  if (os() !== "ios") {
    return VariableBlurViewFallback;
  }

  try {
    const nativeViewConfig = (globalThis as ExpoGlobalWithViewConfig).expo?.getViewConfig?.(
      "NativeIosCommon",
      "VariableBlurView",
    );

    if (!nativeViewConfig) {
      return VariableBlurViewFallback;
    }

    return requireNativeViewManager<VariableBlurViewProps>(
      "NativeIosCommon",
      "VariableBlurView",
    ) as ComponentType<VariableBlurViewProps>;
  } catch {
    return VariableBlurViewFallback;
  }
}

export const VariableBlurView = resolveVariableBlurView();

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "rgba(255,255,255,0.92)",
  },
});
