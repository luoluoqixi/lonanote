import { InputGroup as HeroUIInputGroup } from "heroui-native";

import type {
  InputGroupInputProps,
  InputGroupPrefixProps,
  InputGroupProps,
  InputGroupSuffixProps,
} from "./types";

function InputGroupRoot({ animation, children, className, isDisabled }: InputGroupProps) {
  return (
    <HeroUIInputGroup animation={animation} className={className} isDisabled={isDisabled}>
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
  onValueChange,
  placeholder,
  placeholderColorClassName,
  secureTextEntry,
  selectionColorClassName,
  value,
}: InputGroupInputProps) {
  const namedProps = name == null ? undefined : ({ name } as Record<string, string>);

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
      {...namedProps}
    />
  );
}

function InputGroupPrefix({ children, className, isDecorative }: InputGroupPrefixProps) {
  return (
    <HeroUIInputGroup.Prefix className={className} isDecorative={isDecorative}>
      {children}
    </HeroUIInputGroup.Prefix>
  );
}

function InputGroupSuffix({ children, className, isDecorative }: InputGroupSuffixProps) {
  return (
    <HeroUIInputGroup.Suffix className={className} isDecorative={isDecorative}>
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
