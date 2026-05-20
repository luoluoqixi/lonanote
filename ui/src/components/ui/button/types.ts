import { type PressEvent, Button as WebButton } from "@heroui/react";
import { Button as NativeButton } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import type { GestureResponderEvent } from "react-native";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "outline"
  | "ghost"
  | "danger"
  | "danger-soft";

export type ButtonSize = "sm" | "md" | "lg";

type ButtonPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeButton>,
    | "accessibilityLabel"
    | "children"
    | "className"
    | "isDisabled"
    | "isIconOnly"
    | "onPress"
    | "size"
    | "variant"
  >;
  webProps?: Omit<
    ComponentProps<typeof WebButton>,
    | "aria-label"
    | "children"
    | "className"
    | "isDisabled"
    | "isIconOnly"
    | "onPress"
    | "size"
    | "variant"
  >;
};

export interface ButtonProps extends ButtonPlatformProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
  onPress?: (e: PressEvent | GestureResponderEvent) => void | Promise<void>;
  size?: ButtonSize;
  variant?: ButtonVariant;
  isIconOnly?: boolean;
}
