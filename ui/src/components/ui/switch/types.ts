import type { ComponentProps, ReactNode } from "react";
import type { Label as TamaguiLabel, Switch as TamaguiSwitch } from "tamagui";

import type { NativeHapticsSetting } from "../utils";

export interface SwitchProps extends ComponentProps<typeof TamaguiSwitch> {
  label?: ReactNode;
  labelPosition?: "start" | "end";
  labelProps?: ComponentProps<typeof TamaguiLabel>;
  nativeHaptics?: NativeHapticsSetting;
  thumbProps?: SwitchThumbProps;
  native?: boolean;
}
export type SwitchThumbProps = ComponentProps<typeof TamaguiSwitch.Thumb>;
