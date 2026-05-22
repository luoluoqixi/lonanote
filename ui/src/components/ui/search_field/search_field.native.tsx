import { SearchField as HeroUISearchField } from "heroui-native";

import type {
  SearchFieldClearButtonProps,
  SearchFieldGroupProps,
  SearchFieldInputProps,
  SearchFieldProps,
  SearchFieldSearchIconProps,
} from "./types";

function SearchFieldRoot({
  accessibilityLabel,
  children,
  className,
  defaultValue,
  isDisabled,
  isInvalid,
  isRequired,
  nativeProps,
  onValueChange,
  value,
  webProps,
}: SearchFieldProps) {
  void webProps;
  return (
    <HeroUISearchField
      accessibilityLabel={accessibilityLabel}
      className={className}
      defaultValue={defaultValue}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      onChange={onValueChange}
      value={value}
      {...(nativeProps as any)}
    >
      {children}
    </HeroUISearchField>
  );
}

function SearchFieldGroup({ children, className, nativeProps, webProps }: SearchFieldGroupProps) {
  void webProps;
  return (
    <HeroUISearchField.Group className={className} {...(nativeProps as any)}>
      {children}
    </HeroUISearchField.Group>
  );
}

function SearchFieldInput({ className, nativeProps, webProps, ...props }: SearchFieldInputProps) {
  void webProps;
  return <HeroUISearchField.Input className={className} {...props} {...(nativeProps as any)} />;
}

function SearchFieldSearchIcon({
  children,
  className,
  nativeProps,
  webProps,
}: SearchFieldSearchIconProps) {
  void webProps;
  return (
    <HeroUISearchField.SearchIcon className={className} {...(nativeProps as any)}>
      {children}
    </HeroUISearchField.SearchIcon>
  );
}

function SearchFieldClearButton({ className, nativeProps, webProps }: SearchFieldClearButtonProps) {
  void webProps;
  return <HeroUISearchField.ClearButton className={className} {...(nativeProps as any)} />;
}

export const SearchField = Object.assign(SearchFieldRoot, {
  Root: SearchFieldRoot,
  Group: SearchFieldGroup,
  Input: SearchFieldInput,
  SearchIcon: SearchFieldSearchIcon,
  ClearButton: SearchFieldClearButton,
});
