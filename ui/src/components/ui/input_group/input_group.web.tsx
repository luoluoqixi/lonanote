import { InputGroup as HeroUIInputGroup } from "@heroui/react";

import type { InputProps } from "../input";
import type {
  InputGroupInputProps,
  InputGroupPrefixProps,
  InputGroupProps,
  InputGroupSuffixProps,
} from "./types";

function mapKeyboardTypeToInputMode(
  keyboardType: InputProps["keyboardType"],
): InputProps["inputMode"] | undefined {
  switch (keyboardType) {
    case "decimal-pad":
      return "decimal";
    case "email-address":
      return "email";
    case "number-pad":
    case "numeric":
      return "numeric";
    case "phone-pad":
      return "tel";
    case "url":
      return "url";
    default:
      return undefined;
  }
}

function InputGroupRoot({ children, className, nativeProps, webProps }: InputGroupProps) {
  void nativeProps;
  return (
    <HeroUIInputGroup className={className} {...(webProps as any)}>
      {children}
    </HeroUIInputGroup>
  );
}

function InputGroupInput({
  accessibilityLabel,
  autoCapitalize,
  autoCorrect,
  autoFocus,
  className,
  defaultValue,
  id,
  inputMode,
  isDisabled,
  isInvalid,
  keyboardType,
  name,
  nativeProps,
  onValueChange,
  placeholder,
  secureTextEntry,
  value,
  webProps,
}: InputGroupInputProps) {
  void nativeProps;
  return (
    <HeroUIInputGroup.Input
      aria-label={accessibilityLabel}
      aria-invalid={isInvalid}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect == null ? undefined : autoCorrect ? "on" : "off"}
      autoFocus={autoFocus}
      className={className}
      defaultValue={defaultValue}
      disabled={isDisabled}
      id={id}
      inputMode={inputMode ?? mapKeyboardTypeToInputMode(keyboardType)}
      name={name}
      onChange={(event) => onValueChange?.(event.target.value)}
      placeholder={placeholder}
      type={secureTextEntry ? "password" : undefined}
      value={value}
      {...(webProps as any)}
    />
  );
}

function InputGroupPrefix({ children, className, nativeProps, webProps }: InputGroupPrefixProps) {
  void nativeProps;
  return (
    <HeroUIInputGroup.Prefix className={className} {...(webProps as any)}>
      {children}
    </HeroUIInputGroup.Prefix>
  );
}

function InputGroupSuffix({ children, className, nativeProps, webProps }: InputGroupSuffixProps) {
  void nativeProps;
  return (
    <HeroUIInputGroup.Suffix className={className} {...(webProps as any)}>
      {children}
    </HeroUIInputGroup.Suffix>
  );
}

export const InputGroup = Object.assign(InputGroupRoot, {
  Root: InputGroupRoot,
  Input: InputGroupInput,
  Prefix: InputGroupPrefix,
  Suffix: InputGroupSuffix,
});
