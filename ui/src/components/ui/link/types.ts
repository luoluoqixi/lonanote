import type { ComponentProps } from "react";
import type { Anchor as TamaguiAnchor } from "tamagui";

import type { NativeHapticsSetting } from "../utils";

export type LinkProps = ComponentProps<typeof TamaguiAnchor> & {
  nativeHaptics?: NativeHapticsSetting;
};
