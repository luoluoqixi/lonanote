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

export interface InputProps {
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
