import type { ComponentProps, ReactNode } from "react";
import type { Tabs as TamaguiTabs } from "tamagui";

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
  triggerProps?: Omit<TabsTriggerProps, "value">;
}
export type TabsListProps = ComponentProps<typeof TamaguiTabs.List>;
export type TabsTriggerProps = ComponentProps<typeof TamaguiTabs.Trigger>;
export type TabsTabProps = ComponentProps<typeof TamaguiTabs.Tab>;
export type TabsContentProps = ComponentProps<typeof TamaguiTabs.Content>;
