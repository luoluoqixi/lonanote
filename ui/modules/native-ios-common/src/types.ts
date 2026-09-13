import type { ViewProps } from "react-native";

export type VariableBlurDirection = "topToBottom" | "bottomToTop";

export type VariableBlurViewProps = ViewProps & {
  blurRadius?: number;
  direction?: VariableBlurDirection;
  enabled?: boolean;
  transitionHeight?: number;
};
