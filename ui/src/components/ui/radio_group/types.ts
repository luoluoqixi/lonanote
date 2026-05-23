import type { ReactNode } from "react";

export interface RadioGroupProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  onValueChange?: (nextValue: string) => void;
  value?: string;
  variant?: "primary" | "secondary";
}

export interface RadioGroupItemProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
  value: string;
}
