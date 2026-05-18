import { PressEvent } from "@heroui/react";
import type { ReactNode } from "react";
import { GestureResponderEvent } from "react-native";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "outline"
  | "ghost"
  | "danger"
  | "danger-soft";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
  onPress?: (e: PressEvent | GestureResponderEvent) => void | Promise<void>;
  size?: ButtonSize;
  variant?: ButtonVariant;
}
