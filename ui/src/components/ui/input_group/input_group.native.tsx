import { InputGroup as HeroUIInputGroup } from "heroui-native";

import type {
  InputGroupInputProps,
  InputGroupPrefixProps,
  InputGroupProps,
  InputGroupSuffixProps,
} from "./types";

function InputGroupRoot({ children, className, nativeProps, webProps }: InputGroupProps) {
  void webProps;
  return (
    <HeroUIInputGroup className={className} {...(nativeProps as any)}>
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
  nativeProps,
  onValueChange,
  placeholder,
  placeholderColorClassName,
  secureTextEntry,
  selectionColorClassName,
  value,
  webProps,
}: InputGroupInputProps) {
  void webProps;
  return (
    <HeroUIInputGroup.Input
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
      {...(nativeProps as any)}
    />
  );
}

function InputGroupPrefix({ children, className, nativeProps, webProps }: InputGroupPrefixProps) {
  void webProps;
  return (
    <HeroUIInputGroup.Prefix className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIInputGroup.Prefix>
  );
}

function InputGroupSuffix({ children, className, nativeProps, webProps }: InputGroupSuffixProps) {
  void webProps;
  return (
    <HeroUIInputGroup.Suffix className={className} {...(nativeProps as any)}>
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
