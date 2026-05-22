import { SearchField as HeroUISearchField } from "@heroui/react";

import { Label } from "../label";
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
  clearButtonClassName,
  defaultValue,
  groupClassName,
  hideClearButton,
  hideSearchIcon,
  isDisabled,
  isInvalid,
  isRequired,
  inputClassName,
  label,
  labelClassName,
  nativeProps,
  onValueChange,
  placeholder,
  searchIconClassName,
  value,
  webProps,
}: SearchFieldProps) {
  void nativeProps;

  const content = children ?? (
    <>
      {label == null ? null : <Label className={labelClassName}>{label}</Label>}
      <HeroUISearchField.Group className={groupClassName}>
        {hideSearchIcon ? null : <HeroUISearchField.SearchIcon className={searchIconClassName} />}
        <HeroUISearchField.Input
          aria-label={accessibilityLabel}
          className={inputClassName}
          placeholder={placeholder}
        />
        {hideClearButton ? null : (
          <HeroUISearchField.ClearButton className={clearButtonClassName} />
        )}
      </HeroUISearchField.Group>
    </>
  );

  return (
    <HeroUISearchField
      aria-label={accessibilityLabel}
      className={className}
      defaultValue={defaultValue}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      onChange={onValueChange}
      value={value}
      {...(webProps as any)}
    >
      {content}
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

function SearchFieldInput({
  accessibilityLabel,
  className,
  nativeProps,
  webProps,
  ...props
}: SearchFieldInputProps) {
  void nativeProps;
  return (
    <HeroUISearchField.Input
      aria-label={accessibilityLabel}
      className={className}
      {...props}
      {...(webProps as any)}
    />
  );
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
