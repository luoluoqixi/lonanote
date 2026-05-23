import { Checkbox as WebCheckbox } from "@heroui/react";
import { Checkbox as NativeCheckbox } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";

type CheckboxPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeCheckbox>,
    | "accessibilityLabel"
    | "children"
    | "className"
    | "isDisabled"
    | "isInvalid"
    | "isSelected"
    | "onSelectedChange"
  >;
  webProps?: Omit<
    ComponentProps<typeof WebCheckbox>,
    "aria-label" | "children" | "className" | "isDisabled" | "isInvalid" | "isSelected" | "onChange"
  >;
};

export interface CheckboxProps extends CheckboxPlatformProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  onValueChange?: (nextValue: boolean) => void;
  value: boolean;
}
