import { TextField as WebTextField } from "@heroui/react";
import { TextField as NativeTextField } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";

import type { InputProps } from "../input";

type TextFieldPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeTextField>,
    "children" | "className" | "isDisabled" | "isInvalid" | "isRequired"
  >;
  webProps?: Omit<
    ComponentProps<typeof WebTextField>,
    "children" | "className" | "isDisabled" | "isInvalid" | "isRequired"
  >;
};

export interface TextFieldProps extends TextFieldPlatformProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  errorClassName?: string;
  errorMessage?: ReactNode;
  inputProps?: Omit<InputProps, "isDisabled" | "isInvalid" | "nativeProps" | "webProps">;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  label?: ReactNode;
  labelClassName?: string;
}
