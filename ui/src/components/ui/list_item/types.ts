import type { ComponentProps } from "react";
import type { ListItem as TamaguiListItem } from "tamagui";

import type { NativeHapticsSetting } from "../utils";

export type ListItemProps = ComponentProps<typeof TamaguiListItem> & {
  nativeHaptics?: NativeHapticsSetting;
};
