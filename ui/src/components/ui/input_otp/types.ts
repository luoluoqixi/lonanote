import type { ReactNode } from "react";

export type InputOTPVariant = "primary" | "secondary";

export interface InputOTPProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  defaultValue?: string;
  groupClassName?: string;
  inputMode?: "decimal" | "email" | "none" | "numeric" | "search" | "tel" | "text" | "url";
  isDisabled?: boolean;
  isInvalid?: boolean;
  maxLength: number;
  onComplete?: (value: string) => void;
  onValueChange?: (value: string) => void;
  pattern?: string;
  placeholder?: string;
  separatorClassName?: string;
  separatorIndices?: number[];
  slotClassName?: string;
  value?: string;
  variant?: InputOTPVariant;
}

export interface InputOTPGroupProps {
  children?: ReactNode;
  className?: string;
}

export interface InputOTPSlotProps {
  className?: string;
  index: number;
  variant?: InputOTPVariant;
}

export interface InputOTPSeparatorProps {
  children?: ReactNode;
  className?: string;
}
