import type { ComponentProps, ReactNode } from "react";
import type { Checkbox as TamaguiCheckbox, Label as TamaguiLabel } from "tamagui";
import type { CheckedState } from "tamagui";

import type { NativeHapticsSetting } from "../utils";

export interface CheckboxProps extends ComponentProps<typeof TamaguiCheckbox> {
  indicatorProps?: CheckboxIndicatorProps;
  label?: ReactNode;
  labelProps?: ComponentProps<typeof TamaguiLabel>;
  nativeHaptics?: NativeHapticsSetting;
}
export type CheckboxIndicatorProps = ComponentProps<typeof TamaguiCheckbox.Indicator>;
export type { CheckedState };
