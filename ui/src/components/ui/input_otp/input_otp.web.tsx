import { InputOTP as HeroUIInputOTP } from "@heroui/react";

import type {
  InputOTPGroupProps,
  InputOTPProps,
  InputOTPSeparatorProps,
  InputOTPSlotProps,
} from "./types";

export const REGEXP_ONLY_DIGITS = "^\\d+$";
export const REGEXP_ONLY_CHARS = "^[a-zA-Z]+$";
export const REGEXP_ONLY_DIGITS_AND_CHARS = "^[a-zA-Z0-9]+$";

function InputOTPRoot({
  children,
  className,
  defaultValue,
  inputMode,
  isDisabled,
  isInvalid,
  maxLength,
  nativeProps,
  onComplete,
  onValueChange,
  pattern,
  placeholder,
  value,
  variant,
  webProps,
}: InputOTPProps) {
  void nativeProps;
  return (
    <HeroUIInputOTP
      className={className}
      defaultValue={defaultValue}
      inputMode={inputMode}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      maxLength={maxLength}
      onChange={onValueChange}
      onComplete={onComplete}
      pattern={pattern}
      placeholder={placeholder}
      value={value}
      variant={variant}
      {...(webProps as any)}
    >
      {children}
    </HeroUIInputOTP>
  );
}

function InputOTPGroup({ children, className, nativeProps, webProps }: InputOTPGroupProps) {
  void nativeProps;
  return (
    <HeroUIInputOTP.Group className={className} {...(webProps as any)}>
      {children}
    </HeroUIInputOTP.Group>
  );
}

function InputOTPSlot({ className, index, nativeProps, webProps }: InputOTPSlotProps) {
  void nativeProps;
  return <HeroUIInputOTP.Slot className={className} index={index} {...(webProps as any)} />;
}

function InputOTPSeparator({ children, className, nativeProps, webProps }: InputOTPSeparatorProps) {
  void nativeProps;
  return (
    <HeroUIInputOTP.Separator className={className} {...(webProps as any)}>
      {children}
    </HeroUIInputOTP.Separator>
  );
}

export const InputOTP = Object.assign(InputOTPRoot, {
  Root: InputOTPRoot,
  Group: InputOTPGroup,
  Slot: InputOTPSlot,
  Separator: InputOTPSeparator,
});
