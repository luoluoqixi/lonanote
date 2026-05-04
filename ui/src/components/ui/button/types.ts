import type { ReactNode } from "react";

export type AppButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "outline"
  | "ghost"
  | "danger"
  | "danger-soft";

export type AppButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
  onPress?: () => void | Promise<void>;
  size?: AppButtonSize;
  variant?: AppButtonVariant;
}
