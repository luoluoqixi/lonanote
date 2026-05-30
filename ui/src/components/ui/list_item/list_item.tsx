import { ListItem as TamaguiListItem } from "tamagui";

import { triggerNativeHaptics, useResolvedNativeHaptics } from "@/components/ui/utils";

import type { ListItemProps } from "./types";

export function ListItem(props: ListItemProps) {
  const { nativeHaptics, onPress, ...listItemProps } = props;
  const resolvedNativeHaptics = useResolvedNativeHaptics(nativeHaptics);
  const handlePress: NonNullable<ListItemProps["onPress"]> = (event) => {
    onPress?.(event);

    if (event.defaultPrevented) {
      return;
    }

    triggerNativeHaptics(resolvedNativeHaptics);
  };

  return <TamaguiListItem {...listItemProps} onPress={handlePress} />;
}
