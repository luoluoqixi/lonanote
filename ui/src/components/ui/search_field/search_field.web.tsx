import { SearchField as HeroUISearchField } from "@heroui/react";

import type {
  SearchFieldClearButtonProps,
  SearchFieldGroupProps,
  SearchFieldInputProps,
  SearchFieldProps,
  SearchFieldSearchIconProps,
} from "./types";

function SearchFieldRoot({
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
  void nativeProps;
  return (
    <HeroUISearchField
      className={className}
      defaultValue={defaultValue}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      onChange={onValueChange}
      value={value}
      {...(webProps as any)}
    >
      {children}
    </HeroUISearchField>
  );
}

function SearchFieldGroup({ children, className, nativeProps, webProps }: SearchFieldGroupProps) {
  void nativeProps;
  return (
    <HeroUISearchField.Group className={className} {...(webProps as any)}>
      {children}
    </HeroUISearchField.Group>
  );
}

function SearchFieldInput({ className, nativeProps, webProps, ...props }: SearchFieldInputProps) {
  void nativeProps;
  return <HeroUISearchField.Input className={className} {...props} {...(webProps as any)} />;
}

function SearchFieldSearchIcon({
  children,
  className,
  nativeProps,
  webProps,
}: SearchFieldSearchIconProps) {
  void nativeProps;
  return (
    <HeroUISearchField.SearchIcon className={className} {...(webProps as any)}>
      {children}
    </HeroUISearchField.SearchIcon>
  );
}

function SearchFieldClearButton({ className, nativeProps, webProps }: SearchFieldClearButtonProps) {
  void nativeProps;
  return <HeroUISearchField.ClearButton className={className} {...(webProps as any)} />;
}

export const SearchField = Object.assign(SearchFieldRoot, {
  Root: SearchFieldRoot,
  Group: SearchFieldGroup,
  Input: SearchFieldInput,
  SearchIcon: SearchFieldSearchIcon,
  ClearButton: SearchFieldClearButton,
});
