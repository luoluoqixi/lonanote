import { Tabs as HeroUITabs } from "heroui-native";

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
    <HeroUITabs className={className} onValueChange={onValueChange} value={value}>
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
    <HeroUITabs.Trigger className={className} value={value} {...props}>
      {children}
    </HeroUITabs.Trigger>
  );
}

export function TabsIndicator({ className, ...props }: TabsIndicatorProps) {
  return <HeroUITabs.Indicator className={className} {...props} />;
}

export function TabsSeparator({ betweenValues, className, ...props }: TabsSeparatorProps) {
  return <HeroUITabs.Separator betweenValues={betweenValues} className={className} {...props} />;
}

export function TabsPanel({ children, className, value, ...props }: TabsPanelProps) {
  return (
    <HeroUITabs.Content className={className} value={value} {...props}>
      {children}
    </HeroUITabs.Content>
  );
}
