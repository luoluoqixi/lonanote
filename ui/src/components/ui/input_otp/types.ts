import type {
  InputOTPGroupProps as WebInputOTPGroupProps,
  InputOTPRootProps as WebInputOTPRootProps,
  InputOTPSeparatorProps as WebInputOTPSeparatorProps,
  InputOTPSlotProps as WebInputOTPSlotProps,
} from "@heroui/react";
import type {
  InputOTPGroupProps as NativeInputOTPGroupProps,
  InputOTPRootProps as NativeInputOTPRootProps,
  InputOTPSeparatorProps as NativeInputOTPSeparatorProps,
  InputOTPSlotProps as NativeInputOTPSlotProps,
} from "heroui-native";
import type { ReactNode } from "react";

export type InputOTPVariant = "primary" | "secondary";

type InputOTPPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

export interface InputOTPProps extends InputOTPPlatformProps<
  WebInputOTPRootProps,
  NativeInputOTPRootProps
> {
  children?: ReactNode;
  className?: string;
  defaultValue?: string;
  inputMode?: "decimal" | "email" | "none" | "numeric" | "search" | "tel" | "text" | "url";
  isDisabled?: boolean;
  isInvalid?: boolean;
  maxLength: number;
  onComplete?: (value: string) => void;
  onValueChange?: (value: string) => void;
  pattern?: string;
  placeholder?: string;
  value?: string;
  variant?: InputOTPVariant;
}

export interface InputOTPGroupProps extends InputOTPPlatformProps<
  WebInputOTPGroupProps,
  NativeInputOTPGroupProps
> {
  children?: ReactNode;
  className?: string;
}

export interface InputOTPSlotProps extends InputOTPPlatformProps<
  WebInputOTPSlotProps,
  NativeInputOTPSlotProps
> {
  className?: string;
  index: number;
}

export interface InputOTPSeparatorProps extends InputOTPPlatformProps<
  WebInputOTPSeparatorProps,
  NativeInputOTPSeparatorProps
> {
  children?: ReactNode;
  className?: string;
}
