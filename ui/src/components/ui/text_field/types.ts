import { TextField as WebTextField } from "@heroui/react";
import { TextField as NativeTextField } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";

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
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
}
