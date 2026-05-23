import { SearchField as HeroUISearchField } from "heroui-native";

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
  void webProps;

  const content = children ?? (
    <>
      {label == null ? null : <Label className={labelClassName}>{label}</Label>}
      <HeroUISearchField.Group className={groupClassName}>
        {hideSearchIcon ? null : <HeroUISearchField.SearchIcon className={searchIconClassName} />}
        <HeroUISearchField.Input className={inputClassName} placeholder={placeholder} />
        {hideClearButton ? null : (
          <HeroUISearchField.ClearButton className={clearButtonClassName} />
        )}
      </HeroUISearchField.Group>
    </>
  );

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
      {content}
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
