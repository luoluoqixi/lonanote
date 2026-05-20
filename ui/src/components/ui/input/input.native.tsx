import { Input as HeroUIInput } from "heroui-native";

import type { InputProps } from "./types";

export function Input({
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
  onValueChange,
  placeholder,
  placeholderColorClassName,
  secureTextEntry,
  selectionColorClassName,
  value,
}: InputProps) {
  return (
    <HeroUIInput
      accessibilityLabel={accessibilityLabel}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      autoFocus={autoFocus}
      className={className}
      defaultValue={defaultValue}
      inputMode={inputMode}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      keyboardType={keyboardType}
      nativeID={id}
      onChangeText={onValueChange}
      placeholder={placeholder}
      placeholderColorClassName={placeholderColorClassName}
      secureTextEntry={secureTextEntry}
      selectionColorClassName={selectionColorClassName}
      value={value}
    />
  );
}
