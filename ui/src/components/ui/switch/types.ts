import { Switch as WebSwitch } from "@heroui/react";
import { Switch as NativeSwitch } from "heroui-native";
import type { ComponentProps } from "react";

type SwitchPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeSwitch>,
    "accessibilityLabel" | "className" | "isDisabled" | "isSelected" | "onSelectedChange"
  >;
  webProps?: Omit<
    ComponentProps<typeof WebSwitch>,
    "aria-label" | "className" | "isDisabled" | "isSelected" | "onChange"
  >;
};

export interface SwitchProps extends SwitchPlatformProps {
  accessibilityLabel?: string;
  className?: string;
  isDisabled?: boolean;
  onValueChange?: (nextValue: boolean) => void;
  value: boolean;
}
