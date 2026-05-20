import type {
  InputGroupInputProps as WebInputGroupInputProps,
  InputGroupPrefixProps as WebInputGroupPrefixProps,
  InputGroupRootProps as WebInputGroupRootProps,
  InputGroupSuffixProps as WebInputGroupSuffixProps,
} from "@heroui/react";
import type {
  InputGroupInputProps as NativeInputGroupInputProps,
  InputGroupPrefixProps as NativeInputGroupPrefixProps,
  InputGroupProps as NativeInputGroupRootProps,
  InputGroupSuffixProps as NativeInputGroupSuffixProps,
} from "heroui-native";
import type { ReactNode } from "react";

import type { InputProps } from "../input";

type InputGroupPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

export interface InputGroupProps extends InputGroupPlatformProps<
  WebInputGroupRootProps,
  NativeInputGroupRootProps
> {
  children?: ReactNode;
  className?: string;
}

export interface InputGroupInputProps
  extends
    InputGroupPlatformProps<WebInputGroupInputProps, NativeInputGroupInputProps>,
    InputProps {}

export interface InputGroupPrefixProps extends InputGroupPlatformProps<
  WebInputGroupPrefixProps,
  NativeInputGroupPrefixProps
> {
  children?: ReactNode;
  className?: string;
}

export interface InputGroupSuffixProps extends InputGroupPlatformProps<
  WebInputGroupSuffixProps,
  NativeInputGroupSuffixProps
> {
  children?: ReactNode;
  className?: string;
}
