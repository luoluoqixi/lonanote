import type { InputProps } from "../input";

export interface TextAreaProps extends Omit<InputProps, "secureTextEntry"> {
  rows?: number;
}
