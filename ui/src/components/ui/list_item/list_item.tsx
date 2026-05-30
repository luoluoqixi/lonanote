import { ListItem as TamaguiListItem } from "tamagui";

import { triggerNativeHaptics } from "@/components/ui/utils";

import type { ListItemProps } from "./types";

export function ListItem(props: ListItemProps) {
  const { nativeHaptics, onPress, ...listItemProps } = props;
  const handlePress: NonNullable<ListItemProps["onPress"]> = (event) => {
    onPress?.(event);

    if (event.defaultPrevented) {
      return;
    }

    triggerNativeHaptics(nativeHaptics);
  };

  return <TamaguiListItem {...listItemProps} onPress={handlePress} />;
}
