import type { CloseButtonRootProps as WebCloseButtonRootProps } from "@heroui/react";
import type { CloseButtonProps as NativeCloseButtonProps } from "heroui-native";

import type { ButtonProps } from "../button";

export interface CloseButtonIconProps {
  color?: string;
  size?: number;
}

type CloseButtonPlatformProps = {
  nativeProps?: Omit<
    NativeCloseButtonProps,
    "accessibilityLabel" | "className" | "iconProps" | "isDisabled" | "onPress"
  >;
  webProps?: Omit<WebCloseButtonRootProps, "aria-label" | "className" | "isDisabled" | "onPress">;
};

export interface CloseButtonProps extends CloseButtonPlatformProps {
  accessibilityLabel?: string;
  className?: string;
  iconProps?: CloseButtonIconProps;
  isDisabled?: boolean;
  onPress?: ButtonProps["onPress"];
}
