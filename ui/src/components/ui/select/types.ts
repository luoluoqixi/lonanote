import type { ReactNode } from "react";

export interface SelectOption {
  description?: string;
  isDisabled?: boolean;
  label: string;
  startContent?: ReactNode;
  value: string;
}

export interface SelectProps {
  accessibilityLabel?: string;
  className?: string;
  contentClassName?: string;
  isDisabled?: boolean;
  onValueChange?: (nextValue: string | null) => void;
  options: SelectOption[];
  placeholder: string;
  value?: string;
}
