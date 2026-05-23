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
  name,
  onValueChange,
  placeholder,
  placeholderColorClassName,
  rows,
  selectionColorClassName,
  value,
}: TextAreaProps) {
  const namedProps = name == null ? undefined : ({ name } as Record<string, string>);

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
      numberOfLines={rows}
      onChangeText={onValueChange}
      placeholder={placeholder}
      placeholderColorClassName={placeholderColorClassName}
      selectionColorClassName={selectionColorClassName}
      value={value}
      {...namedProps}
    />
  );
}
