import type { TextAreaRootProps as WebTextAreaRootProps } from "@heroui/react";
import type { TextAreaProps as NativeTextAreaProps } from "heroui-native";

import type { InputProps } from "../input";

type TextAreaPlatformProps = {
  nativeProps?: Omit<
    NativeTextAreaProps,
    | "accessibilityLabel"
    | "className"
    | "defaultValue"
    | "inputMode"
    | "isDisabled"
    | "isInvalid"
    | "nativeID"
    | "onChangeText"
    | "placeholder"
    | "value"
  >;
  webProps?: Omit<
    WebTextAreaRootProps,
    | "aria-label"
    | "autoCapitalize"
    | "autoCorrect"
    | "autoFocus"
    | "className"
    | "defaultValue"
    | "disabled"
    | "id"
    | "inputMode"
    | "name"
    | "onChange"
    | "placeholder"
    | "value"
  >;
};

export interface TextAreaProps extends TextAreaPlatformProps, Omit<InputProps, "secureTextEntry"> {
  rows?: number;
}
