import { Tabs as HeroUITabs } from "@heroui/react";

import type {
  TabsIndicatorProps,
  TabsListProps,
  TabsPanelProps,
  TabsProps,
  TabsSeparatorProps,
  TabsTabProps,
} from "./types";

export function Tabs({ children, className, onValueChange, value }: TabsProps) {
  return (
    <HeroUITabs
      className={className}
      onSelectionChange={(nextValue) => onValueChange(String(nextValue))}
      selectedKey={value}
    >
      {children}
    </HeroUITabs>
  );
}

export function TabsList({ children, className, ...props }: TabsListProps) {
  return (
    <HeroUITabs.List className={className} {...props}>
      {children}
    </HeroUITabs.List>
  );
}

export function TabsTab({ children, className, value, ...props }: TabsTabProps) {
  return (
    <HeroUITabs.Tab className={className} id={value} {...props}>
      {children}
    </HeroUITabs.Tab>
  );
}

export function TabsIndicator({ className, ...props }: TabsIndicatorProps) {
  return <HeroUITabs.Indicator className={className} {...props} />;
}

export function TabsSeparator({ betweenValues, className, ...props }: TabsSeparatorProps) {
  void betweenValues;
  return <HeroUITabs.Separator className={className} {...props} />;
}

export function TabsPanel({ children, className, value, ...props }: TabsPanelProps) {
  return (
    <HeroUITabs.Panel className={className} id={value} {...props}>
      {children}
    </HeroUITabs.Panel>
  );
}
