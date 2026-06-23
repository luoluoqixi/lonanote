import { requireNativeViewManager } from "expo-modules-core";
import type { ComponentType } from "react";
import { StyleSheet, View } from "react-native";
import type { ViewProps } from "react-native";

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

const nativeViewConfig = (globalThis as ExpoGlobalWithViewConfig).expo?.getViewConfig?.(
  "NativeIosCommon",
  "VariableBlurView",
);
const hasNativeVariableBlurView = Boolean(nativeViewConfig);

const VariableBlurViewFallback: ComponentType<VariableBlurViewProps> =
  function VariableBlurViewFallback({ style, ...props }) {
    return <View {...props} style={[styles.fallback, style]} />;
  };

export const VariableBlurView = hasNativeVariableBlurView
  ? (requireNativeViewManager<VariableBlurViewProps>(
      "NativeIosCommon",
      "VariableBlurView",
    ) as ComponentType<VariableBlurViewProps>)
  : VariableBlurViewFallback;

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "rgba(255,255,255,0.92)",
  },
});
