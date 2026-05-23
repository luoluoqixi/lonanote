import type { ReactNode } from "react";

import type { InputProps } from "../input";

export interface TextFieldProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  errorClassName?: string;
  errorMessage?: ReactNode;
  inputProps?: Omit<InputProps, "isDisabled" | "isInvalid">;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  label?: ReactNode;
  labelClassName?: string;
}
