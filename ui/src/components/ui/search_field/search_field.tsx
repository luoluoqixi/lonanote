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
  onValueChange,
  placeholder,
  searchIconClassName,
  value,
}: SearchFieldProps) {
  void defaultValue;

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
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      onChange={onValueChange}
      value={value}
    >
      {content}
    </HeroUISearchField>
  );
}

function SearchFieldGroup({ children, className }: SearchFieldGroupProps) {
  return <HeroUISearchField.Group className={className}>{children}</HeroUISearchField.Group>;
}

function SearchFieldInput({ className, ...props }: SearchFieldInputProps) {
  return <HeroUISearchField.Input className={className} {...props} />;
}

function SearchFieldSearchIcon({ children, className }: SearchFieldSearchIconProps) {
  return (
    <HeroUISearchField.SearchIcon className={className}>{children}</HeroUISearchField.SearchIcon>
  );
}

function SearchFieldClearButton({ className }: SearchFieldClearButtonProps) {
  return <HeroUISearchField.ClearButton className={className} />;
}

export const SearchField = Object.assign(SearchFieldRoot, {
  Root: SearchFieldRoot,
  Group: SearchFieldGroup,
  Input: SearchFieldInput,
  SearchIcon: SearchFieldSearchIcon,
  ClearButton: SearchFieldClearButton,
});
