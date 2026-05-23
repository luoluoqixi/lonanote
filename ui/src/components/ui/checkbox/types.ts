import type { ReactNode } from "react";

export interface CheckboxProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  onValueChange?: (nextValue: boolean) => void;
  value: boolean;
}
