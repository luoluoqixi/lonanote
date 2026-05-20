import { Select as WebSelect } from "@heroui/react";
import { Select as NativeSelect } from "heroui-native";
import type { ComponentProps } from "react";

export interface SelectOption {
  description?: string;
  isDisabled?: boolean;
  label: string;
  startContent?: React.ReactNode;
  value: string;
}

type SelectPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeSelect>,
    "accessibilityLabel" | "children" | "isDisabled" | "onValueChange" | "value"
  >;
  webProps?: Omit<
    ComponentProps<typeof WebSelect>,
    "aria-label" | "children" | "isDisabled" | "onChange" | "placeholder" | "value"
  >;
};

export interface SelectProps extends SelectPlatformProps {
  accessibilityLabel?: string;
  className?: string;
  contentClassName?: string;
  isDisabled?: boolean;
  onValueChange?: (nextValue: string | null) => void;
  options: SelectOption[];
  placeholder: string;
  value?: string;
}
