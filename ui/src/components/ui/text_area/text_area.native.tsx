import { TextArea as HeroUITextArea } from "heroui-native";

import type { TextAreaProps } from "./types";

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
  nativeProps,
  onValueChange,
  placeholder,
  placeholderColorClassName,
  rows,
  selectionColorClassName,
  value,
  webProps,
}: TextAreaProps) {
  void rows;
  void webProps;
  return (
    <HeroUITextArea
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
      selectionColorClassName={selectionColorClassName}
      value={value}
      {...(nativeProps as any)}
    />
  );
}
