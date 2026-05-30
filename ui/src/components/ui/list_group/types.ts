import type { ComponentProps, ReactNode } from "react";
import type { YGroup } from "tamagui";

import type { ListItemProps } from "../list_item";
import type { SeparatorProps } from "../separator";
import type { NativeHapticsSetting } from "../utils";

export type ListGroupGroupItemProps = ComponentProps<typeof YGroup.Item>;

export interface ListGroupItemData extends Omit<ListItemProps, "children"> {
  children?: ReactNode;
  groupItemProps?: ListGroupGroupItemProps;
  key?: string;
  showSeparator?: boolean;
}

export interface ListGroupProps extends Omit<ComponentProps<typeof YGroup>, "children" | "items"> {
  children?: ReactNode;
  groupItemProps?: ListGroupGroupItemProps;
  itemProps?: ListItemProps;
  items?: ListGroupItemData[];
  nativeHaptics?: NativeHapticsSetting;
  separator?: boolean;
  separatorProps?: SeparatorProps;
}
