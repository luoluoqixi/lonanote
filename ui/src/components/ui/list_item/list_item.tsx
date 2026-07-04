import { ListItem as TamaguiListItem } from "tamagui";

import { triggerNativeHaptics, useResolvedNativeHaptics } from "@/components/ui/utils";

import type { ListItemProps } from "./types";

const DEFAULT_HOVER_STYLE = {
  background: "$color3",
} as const;

const DEFAULT_PRESS_STYLE = {
  background: "$color4",
} as const;

export function ListItem(props: ListItemProps) {
  const { hoverStyle, nativeHaptics, onPress, pressStyle, ...listItemProps } = props;
  const resolvedNativeHaptics = useResolvedNativeHaptics(nativeHaptics);
  const handlePress: NonNullable<ListItemProps["onPress"]> = (event) => {
    onPress?.(event);

    if (event.defaultPrevented) {
      return;
    }

    triggerNativeHaptics(resolvedNativeHaptics);
  };

  return (
    <TamaguiListItem
      {...listItemProps}
      hoverStyle={hoverStyle ?? DEFAULT_HOVER_STYLE}
      onPress={handlePress}
      pressStyle={pressStyle ?? DEFAULT_PRESS_STYLE}
    />
  );
}
