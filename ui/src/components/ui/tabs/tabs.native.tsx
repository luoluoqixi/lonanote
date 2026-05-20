import { Tabs as HeroUITabs } from "heroui-native";

import type {
  TabsIndicatorProps,
  TabsListProps,
  TabsPanelProps,
  TabsProps,
  TabsSeparatorProps,
  TabsTabProps,
} from "./types";

export function Tabs({
  children,
  className,
  nativeProps,
  onValueChange,
  value,
  webProps,
}: TabsProps) {
  void webProps;
  return (
    <HeroUITabs
      className={className}
      onValueChange={onValueChange}
      value={value}
      {...(nativeProps as any)}
    >
      {children}
    </HeroUITabs>
  );
}

export function TabsList({ children, className, nativeProps, webProps }: TabsListProps) {
  void webProps;
  return (
    <HeroUITabs.List className={className} {...(nativeProps as any)}>
      {children}
    </HeroUITabs.List>
  );
}

export function TabsTab({ children, className, nativeProps, value, webProps }: TabsTabProps) {
  void webProps;
  return (
    <HeroUITabs.Trigger className={className} value={value} {...(nativeProps as any)}>
      {children}
    </HeroUITabs.Trigger>
  );
}

export function TabsIndicator({ className, nativeProps, webProps }: TabsIndicatorProps) {
  void webProps;
  return <HeroUITabs.Indicator className={className} {...(nativeProps as any)} />;
}

export function TabsSeparator({
  betweenValues,
  className,
  nativeProps,
  webProps,
}: TabsSeparatorProps) {
  void webProps;
  return (
    <HeroUITabs.Separator
      betweenValues={betweenValues}
      className={className}
      {...(nativeProps as any)}
    />
  );
}

export function TabsPanel({ children, className, nativeProps, value, webProps }: TabsPanelProps) {
  void webProps;
  return (
    <HeroUITabs.Content className={className} value={value} {...(nativeProps as any)}>
      {children}
    </HeroUITabs.Content>
  );
}
