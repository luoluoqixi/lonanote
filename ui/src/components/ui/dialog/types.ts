import { AlertDialog as WebDialog } from "@heroui/react";
import { Dialog as NativeDialog } from "heroui-native";
import type { CSSProperties, ComponentProps, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

type DialogContentStyle = Pick<
  ViewStyle & CSSProperties,
  "width" | "height" | "minWidth" | "minHeight" | "maxWidth" | "maxHeight" | "overflow"
>;

type DialogPlatformProps = {
  nativeProps?: Omit<ComponentProps<typeof NativeDialog>, "children" | "isOpen" | "onOpenChange">;
  webProps?: Omit<ComponentProps<typeof WebDialog>, "children" | "isOpen" | "onOpenChange">;
};

export interface DialogProps extends DialogPlatformProps {
  actions?: ReactNode;
  accessibilityLabel?: string;
  children?: ReactNode;
  contentStyle?: StyleProp<DialogContentStyle>;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: ReactNode;
}
