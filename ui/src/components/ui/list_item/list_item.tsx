import { ListItem as TamaguiListItem } from "tamagui";

import type { ListItemProps } from "./types";

export function ListItem(props: ListItemProps) {
  return <TamaguiListItem {...props} />;
}
