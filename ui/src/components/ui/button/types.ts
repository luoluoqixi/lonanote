import type { ButtonVariant as HeroUIButtonVariant } from "heroui-native";
import type { ReactNode } from "react";
import type { GestureResponderEvent } from "react-native";

export type ButtonVariant = HeroUIButtonVariant;

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
  isIconOnly?: boolean;
  onPress?: (e: GestureResponderEvent) => void | Promise<void>;
  size?: ButtonSize;
  variant?: ButtonVariant;
}
