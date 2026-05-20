import { Tabs as WebTabs } from "@heroui/react";
import { Tabs as NativeTabs } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";

export type TabsOrientation = "horizontal" | "vertical";
export type TabsVariant = "line" | "underline" | "solid";

type TabsRootPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeTabs>,
    "children" | "className" | "onValueChange" | "value"
  >;
  webProps?: Omit<
    ComponentProps<typeof WebTabs>,
    "children" | "className" | "onSelectionChange" | "selectedKey"
  >;
};

type TabsListPlatformProps = {
  nativeProps?: Omit<ComponentProps<typeof NativeTabs.List>, "children" | "className">;
  webProps?: Omit<ComponentProps<typeof WebTabs.List>, "children" | "className">;
};

type TabsTabPlatformProps = {
  nativeProps?: Omit<ComponentProps<typeof NativeTabs.Trigger>, "children" | "className" | "value">;
  webProps?: Omit<ComponentProps<typeof WebTabs.Tab>, "children" | "className" | "id">;
};

type TabsIndicatorPlatformProps = {
  nativeProps?: Omit<ComponentProps<typeof NativeTabs.Indicator>, "className">;
  webProps?: Omit<ComponentProps<typeof WebTabs.Indicator>, "className">;
};

type TabsSeparatorPlatformProps = {
  nativeProps?: Omit<ComponentProps<typeof NativeTabs.Separator>, "betweenValues" | "className">;
  webProps?: Omit<ComponentProps<typeof WebTabs.Separator>, "className">;
};

type TabsPanelPlatformProps = {
  nativeProps?: Omit<ComponentProps<typeof NativeTabs.Content>, "children" | "className" | "value">;
  webProps?: Omit<ComponentProps<typeof WebTabs.Panel>, "children" | "className" | "id">;
};

export interface TabsProps extends TabsRootPlatformProps {
  children?: ReactNode;
  className?: string;
  onValueChange: (nextValue: string) => void;
  value: string;
}

export interface TabsListContainerProps extends TabsListPlatformProps {
  children?: ReactNode;
  className?: string;
}

export interface TabsListProps extends TabsListPlatformProps {
  children?: ReactNode;
  className?: string;
}

export interface TabsTabProps extends TabsTabPlatformProps {
  children?: ReactNode;
  className?: string;
  value: string;
}

export interface TabsIndicatorProps extends TabsIndicatorPlatformProps {
  className?: string;
}

export interface TabsSeparatorProps extends TabsSeparatorPlatformProps {
  betweenValues: string[];
  className?: string;
}

export interface TabsPanelProps extends TabsPanelPlatformProps {
  children?: ReactNode;
  className?: string;
  value: string;
}
