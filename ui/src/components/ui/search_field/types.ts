import type { ReactNode } from "react";

import type { InputProps } from "../input";

export interface SearchFieldProps {
  children?: ReactNode;
  className?: string;
  clearButtonClassName?: string;
  defaultValue?: string;
  groupClassName?: string;
  hideClearButton?: boolean;
  hideSearchIcon?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  accessibilityLabel?: string;
  inputClassName?: string;
  label?: ReactNode;
  labelClassName?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchIconClassName?: string;
  value?: string;
}

export interface SearchFieldGroupProps {
  children?: ReactNode;
  className?: string;
}

export interface SearchFieldInputProps extends Omit<
  InputProps,
  "isDisabled" | "isInvalid" | "onValueChange" | "value"
> {}

export interface SearchFieldSearchIconProps {
  children?: ReactNode;
  className?: string;
}

export interface SearchFieldClearButtonProps {
  className?: string;
}
