import type { CSSProperties, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

type DialogContentStyle = Pick<
  ViewStyle & CSSProperties,
  "width" | "height" | "minWidth" | "minHeight" | "maxWidth" | "maxHeight" | "overflow"
>;

export interface DialogProps {
  actions?: ReactNode;
  children?: ReactNode;
  contentStyle?: StyleProp<DialogContentStyle>;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: ReactNode;
}
