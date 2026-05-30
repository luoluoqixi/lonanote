import type { ComponentProps, ReactNode } from "react";
import type { Label as TamaguiLabel, RadioGroup as TamaguiRadioGroup } from "tamagui";

import type { NativeHapticsSetting } from "../utils";

export interface RadioGroupItemData {
  "aria-label"?: string;
  disabled?: boolean;
  id?: string;
  label: ReactNode;
  value: string;
}

type RadioGroupRootProps = Omit<ComponentProps<typeof TamaguiRadioGroup>, "children" | "items">;

export interface RadioGroupProps extends RadioGroupRootProps {
  children?: ReactNode;
  indicatorProps?: RadioGroupIndicatorProps;
  itemProps?: Omit<RadioGroupItemProps, "value">;
  items?: RadioGroupItemData[];
  labelProps?: ComponentProps<typeof TamaguiLabel>;
  nativeHaptics?: NativeHapticsSetting;
}
export type RadioGroupItemProps = ComponentProps<typeof TamaguiRadioGroup.Item>;
export type RadioGroupIndicatorProps = ComponentProps<typeof TamaguiRadioGroup.Indicator>;
