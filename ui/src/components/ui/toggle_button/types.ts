import { ToggleButton as WebToggleButton } from "@heroui/react";
import type { ComponentProps, ReactNode } from "react";

import type { ButtonProps } from "../button";

type ToggleButtonPlatformProps = {
  nativeProps?: Omit<
    ButtonProps,
    | "accessibilityLabel"
    | "children"
    | "className"
    | "isDisabled"
    | "nativeProps"
    | "onPress"
    | "webProps"
  >;
  webProps?: Omit<
    ComponentProps<typeof WebToggleButton>,
    | "aria-label"
    | "children"
    | "className"
    | "defaultSelected"
    | "isDisabled"
    | "isSelected"
    | "onChange"
  >;
};

export interface ToggleButtonProps extends ToggleButtonPlatformProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  defaultSelected?: boolean;
  isDisabled?: boolean;
  isSelected?: boolean;
  onValueChange?: (nextValue: boolean) => void;
}
