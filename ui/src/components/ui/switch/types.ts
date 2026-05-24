import type { ComponentProps, ReactNode } from "react";
import type { Label as TamaguiLabel, Switch as TamaguiSwitch } from "tamagui";

export interface SwitchProps extends ComponentProps<typeof TamaguiSwitch> {
  label?: ReactNode;
  labelPosition?: "start" | "end";
  labelProps?: ComponentProps<typeof TamaguiLabel>;
  thumbProps?: SwitchThumbProps;
}
export type SwitchThumbProps = ComponentProps<typeof TamaguiSwitch.Thumb>;
