import { Input as WebInput } from "@heroui/react";
import { Input as NativeInput } from "heroui-native";
import type { ComponentProps } from "react";
import type { TextInputProps } from "react-native";

export type InputMode =
  | "decimal"
  | "email"
  | "none"
  | "numeric"
  | "search"
  | "tel"
  | "text"
  | "url";

type InputPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeInput>,
    | "accessibilityLabel"
    | "autoCapitalize"
    | "autoCorrect"
    | "autoFocus"
    | "className"
    | "defaultValue"
    | "inputMode"
    | "isDisabled"
    | "isInvalid"
    | "keyboardType"
    | "nativeID"
    | "onChangeText"
    | "placeholder"
    | "placeholderColorClassName"
    | "secureTextEntry"
    | "selectionColorClassName"
    | "value"
  >;
  webProps?: Omit<
    ComponentProps<typeof WebInput>,
    | "aria-invalid"
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
    | "type"
    | "value"
  >;
};

export interface InputProps extends InputPlatformProps {
  accessibilityLabel?: string;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
  autoFocus?: boolean;
  className?: string;
  defaultValue?: string;
  id?: string;
  inputMode?: InputMode;
  isDisabled?: boolean;
  isInvalid?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  name?: string;
  onValueChange?: (nextValue: string) => void;
  placeholder?: string;
  placeholderColorClassName?: string;
  secureTextEntry?: boolean;
  selectionColorClassName?: string;
  value?: string;
}
