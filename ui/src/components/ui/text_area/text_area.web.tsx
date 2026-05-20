import { TextArea as HeroUITextArea } from "@heroui/react";

import type { InputProps } from "../input";
import type { TextAreaProps } from "./types";

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

export function TextArea({
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
  rows,
  value,
  webProps,
}: TextAreaProps) {
  void nativeProps;
  return (
    <HeroUITextArea
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
      rows={rows}
      value={value}
      {...(webProps as any)}
    />
  );
}
