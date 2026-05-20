import { Label as WebLabel } from "@heroui/react";
import { Label as NativeLabel } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";

type LabelPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeLabel>,
    "children" | "className" | "isDisabled" | "isInvalid" | "isRequired"
  >;
  webProps?: Omit<
    ComponentProps<typeof WebLabel>,
    "children" | "className" | "htmlFor" | "isDisabled" | "isInvalid" | "isRequired"
  >;
};

export interface LabelProps extends LabelPlatformProps {
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
}
