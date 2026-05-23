import { InputOTP as HeroUIInputOTP } from "heroui-native";

import type {
  InputOTPGroupProps,
  InputOTPProps,
  InputOTPSeparatorProps,
  InputOTPSlotProps,
} from "./types";

export { REGEXP_ONLY_CHARS, REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS } from "heroui-native";

function InputOTPRoot({
  accessibilityLabel,
  children,
  className,
  defaultValue,
  groupClassName,
  inputMode,
  isDisabled,
  isInvalid,
  maxLength,
  onComplete,
  onValueChange,
  pattern,
  placeholder,
  separatorClassName,
  separatorIndices,
  slotClassName,
  value,
  variant,
}: InputOTPProps) {
  const textInputProps =
    accessibilityLabel == null
      ? undefined
      : ({ accessibilityLabel } as { accessibilityLabel: string });

  const defaultChildren = children ?? (
    <HeroUIInputOTP.Group className={groupClassName}>
      {Array.from({ length: maxLength }, (_, index) => {
        const showSeparator = separatorIndices?.includes(index) && index < maxLength - 1;
        return [
          <HeroUIInputOTP.Slot
            className={slotClassName}
            index={index}
            key={`slot-${index}`}
            variant={variant}
          />,
          showSeparator ? (
            <HeroUIInputOTP.Separator className={separatorClassName} key={`separator-${index}`} />
          ) : null,
        ];
      })}
    </HeroUIInputOTP.Group>
  );

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
      textInputProps={textInputProps}
      value={value}
      variant={variant}
    >
      {defaultChildren}
    </HeroUIInputOTP>
  );
}

function InputOTPGroup({ children, className }: InputOTPGroupProps) {
  return <HeroUIInputOTP.Group className={className}>{children}</HeroUIInputOTP.Group>;
}

function InputOTPSlot({ className, index, variant }: InputOTPSlotProps) {
  return <HeroUIInputOTP.Slot className={className} index={index} variant={variant} />;
}

function InputOTPSeparator({ children, className }: InputOTPSeparatorProps) {
  return <HeroUIInputOTP.Separator className={className}>{children}</HeroUIInputOTP.Separator>;
}

export const InputOTP = Object.assign(InputOTPRoot, {
  Root: InputOTPRoot,
  Group: InputOTPGroup,
  Slot: InputOTPSlot,
  Separator: InputOTPSeparator,
});
