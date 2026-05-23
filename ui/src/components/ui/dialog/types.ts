import type { ReactNode } from "react";
import type { DimensionValue, StyleProp, ViewStyle } from "react-native";

type DialogContentStyle = ViewStyle;

export interface DialogProps {
  actions?: ReactNode;
  accessibilityLabel?: string;
  children?: ReactNode;
  contentStyle?: StyleProp<DialogContentStyle>;
  maxWidth?: DimensionValue | undefined;
  maxHeight?: DimensionValue | undefined;
  width?: DimensionValue | undefined;
  height?: DimensionValue | undefined;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: ReactNode;
  isCloseOnPressOverlay?: boolean;
}
