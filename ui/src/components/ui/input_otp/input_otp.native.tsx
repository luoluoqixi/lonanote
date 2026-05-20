import { InputOTP as HeroUIInputOTP } from "heroui-native";

import type {
  InputOTPGroupProps,
  InputOTPProps,
  InputOTPSeparatorProps,
  InputOTPSlotProps,
} from "./types";

export { REGEXP_ONLY_CHARS, REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS } from "heroui-native";

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
  void webProps;
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
      {...(nativeProps as any)}
    >
      {children}
    </HeroUIInputOTP>
  );
}

function InputOTPGroup({ children, className, nativeProps, webProps }: InputOTPGroupProps) {
  void webProps;
  return (
    <HeroUIInputOTP.Group className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIInputOTP.Group>
  );
}

function InputOTPSlot({ className, index, nativeProps, webProps }: InputOTPSlotProps) {
  void webProps;
  return <HeroUIInputOTP.Slot className={className} index={index} {...(nativeProps as any)} />;
}

function InputOTPSeparator({ children, className, nativeProps, webProps }: InputOTPSeparatorProps) {
  void webProps;
  return (
    <HeroUIInputOTP.Separator className={className} {...(nativeProps as any)}>
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
