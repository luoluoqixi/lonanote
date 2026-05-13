import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export interface DialogProps {
  actions?: ReactNode;
  children?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  description?: ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: ReactNode;
}
