import type {
  SearchFieldClearButtonProps as WebSearchFieldClearButtonProps,
  SearchFieldGroupProps as WebSearchFieldGroupProps,
  SearchFieldInputProps as WebSearchFieldInputProps,
  SearchFieldRootProps as WebSearchFieldRootProps,
  SearchFieldSearchIconProps as WebSearchFieldSearchIconProps,
} from "@heroui/react";
import type {
  SearchFieldClearButtonProps as NativeSearchFieldClearButtonProps,
  SearchFieldGroupProps as NativeSearchFieldGroupProps,
  SearchFieldInputProps as NativeSearchFieldInputProps,
  SearchFieldProps as NativeSearchFieldRootProps,
  SearchFieldSearchIconProps as NativeSearchFieldSearchIconProps,
} from "heroui-native";
import type { ReactNode } from "react";

import type { InputProps } from "../input";

type SearchFieldPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

export interface SearchFieldProps extends SearchFieldPlatformProps<
  WebSearchFieldRootProps,
  NativeSearchFieldRootProps
> {
  children?: ReactNode;
  className?: string;
  defaultValue?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  accessibilityLabel?: string;
  onValueChange?: (value: string) => void;
  value?: string;
}

export interface SearchFieldGroupProps extends SearchFieldPlatformProps<
  WebSearchFieldGroupProps,
  NativeSearchFieldGroupProps
> {
  children?: ReactNode;
  className?: string;
}

export interface SearchFieldInputProps
  extends
    SearchFieldPlatformProps<WebSearchFieldInputProps, NativeSearchFieldInputProps>,
    Omit<
      InputProps,
      "isDisabled" | "isInvalid" | "nativeProps" | "onValueChange" | "value" | "webProps"
    > {}

export interface SearchFieldSearchIconProps extends SearchFieldPlatformProps<
  WebSearchFieldSearchIconProps,
  NativeSearchFieldSearchIconProps
> {
  children?: ReactNode;
  className?: string;
}

export interface SearchFieldClearButtonProps extends SearchFieldPlatformProps<
  WebSearchFieldClearButtonProps,
  NativeSearchFieldClearButtonProps
> {
  className?: string;
}
