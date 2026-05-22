import { Tabs as HeroUITabs } from "@heroui/react";

import type {
  TabsIndicatorProps,
  TabsListContainerProps,
  TabsListProps,
  TabsPanelProps,
  TabsProps,
  TabsSeparatorProps,
  TabsTabProps,
} from "./types";

export function Tabs({
  accessibilityLabel,
  children,
  className,
  nativeProps,
  onValueChange,
  value,
  webProps,
}: TabsProps) {
  void nativeProps;
  return (
    <HeroUITabs
      aria-label={accessibilityLabel}
      className={className}
      onSelectionChange={(nextValue) => onValueChange(String(nextValue))}
      selectedKey={value}
      {...(webProps as any)}
    >
      {children}
    </HeroUITabs>
  );
}

export function TabsListContainer({
  children,
  className,
  nativeProps,
  webProps,
}: TabsListContainerProps) {
  void nativeProps;
  return (
    <HeroUITabs.ListContainer className={className} {...(webProps as any)}>
      {children}
    </HeroUITabs.ListContainer>
  );
}

export function TabsList({ children, className, nativeProps, webProps }: TabsListProps) {
  void nativeProps;
  return (
    <HeroUITabs.List className={className} {...(webProps as any)}>
      {children}
    </HeroUITabs.List>
  );
}

export function TabsTab({ children, className, nativeProps, value, webProps }: TabsTabProps) {
  void nativeProps;
  return (
    <HeroUITabs.Tab className={className} id={value} {...(webProps as any)}>
      {children}
    </HeroUITabs.Tab>
  );
}

export function TabsIndicator({ className, nativeProps, webProps }: TabsIndicatorProps) {
  void nativeProps;
  return <HeroUITabs.Indicator className={className} {...(webProps as any)} />;
}

export function TabsSeparator({
  betweenValues,
  className,
  nativeProps,
  webProps,
}: TabsSeparatorProps) {
  void betweenValues;
  void nativeProps;
  return <HeroUITabs.Separator className={className} {...(webProps as any)} />;
}

export function TabsPanel({ children, className, nativeProps, value, webProps }: TabsPanelProps) {
  void nativeProps;
  return (
    <HeroUITabs.Panel className={className} id={value} {...(webProps as any)}>
      {children}
    </HeroUITabs.Panel>
  );
}
