import type { ComponentProps, ReactNode } from "react";
import type { Tabs as TamaguiTabs } from "tamagui";

import type { NativeHapticsSetting } from "../utils";

export interface TabsItemData {
  "aria-label"?: string;
  content: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  value: string;
}

type TabsRootProps = Omit<ComponentProps<typeof TamaguiTabs>, "children" | "items">;

export interface TabsProps extends TabsRootProps {
  "aria-label"?: string;
  children?: ReactNode;
  contentProps?: Omit<TabsContentProps, "value">;
  items?: TabsItemData[];
  listProps?: TabsListProps;
  nativeHaptics?: NativeHapticsSetting;
  tabProps?: Omit<TabsTabProps, "value">;
}
export type TabsListProps = ComponentProps<typeof TamaguiTabs.List>;
export type TabsTabProps = ComponentProps<typeof TamaguiTabs.Tab>;
export type TabsContentProps = ComponentProps<typeof TamaguiTabs.Content>;
