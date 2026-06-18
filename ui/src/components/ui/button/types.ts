import type { ComponentProps } from "react";
import type { Button as TamaguiButton } from "tamagui";

import type { NativeHapticsSetting } from "../utils";

export type ButtonProps = ComponentProps<typeof TamaguiButton> & {
  delayLongPress?: number;
  nativeHaptics?: NativeHapticsSetting;
  native?: boolean;
  title?: string;
};
