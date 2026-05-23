import clsx from "clsx";
import { Tabs as HeroUITabs } from "heroui-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import type {
  TabsIndicatorProps,
  TabsListContainerProps,
  TabsListProps,
  TabsPanelProps,
  TabsProps,
  TabsSeparatorProps,
  TabsTabProps,
} from "./types";

function renderTabLabel(label: ReactNode) {
  if (typeof label === "string" || typeof label === "number") {
    return <Text>{label}</Text>;
  }

  return label;
}

export function Tabs({
  accessibilityLabel,
  children,
  variant = "secondary",
  orientation,
  className,
  indicatorClassName,
  items,
  listClassName,
  listContainerClassName,
  onValueChange,
  panelClassName,
  tabClassName,
  value,
}: TabsProps) {
  const isVertical = orientation === "vertical";
  const content =
    children ??
    (items ? (
      <>
        <View className={listContainerClassName}>
          <HeroUITabs.List
            className={clsx(isVertical ? "flex-col w-full" : undefined, listClassName)}
          >
            {items.map((item) => (
              <HeroUITabs.Trigger
                className={clsx(tabClassName, item.tabClassName)}
                key={item.value}
                value={item.value}
              >
                <HeroUITabs.Indicator className={indicatorClassName} />
                {renderTabLabel(item.label)}
              </HeroUITabs.Trigger>
            ))}
          </HeroUITabs.List>
        </View>
        {items.map((item) =>
          item.content === undefined ? null : (
            <HeroUITabs.Content
              className={clsx(panelClassName, item.panelClassName)}
              key={item.value}
              value={item.value}
            >
              {item.content}
            </HeroUITabs.Content>
          ),
        )}
      </>
    ) : null);

  return (
    <HeroUITabs
      accessibilityLabel={accessibilityLabel}
      className={className}
      onValueChange={onValueChange}
      value={value}
      variant={variant}
    >
      {content}
    </HeroUITabs>
  );
}

export function TabsListContainer({ children, className }: TabsListContainerProps) {
  return <View className={className}>{children}</View>;
}

export function TabsList({ children, className }: TabsListProps) {
  return <HeroUITabs.List className={className}>{children}</HeroUITabs.List>;
}

export function TabsTab({ children, className, value }: TabsTabProps) {
  return (
    <HeroUITabs.Trigger className={className} value={value}>
      {children}
    </HeroUITabs.Trigger>
  );
}

export function TabsIndicator({ className }: TabsIndicatorProps) {
  return <HeroUITabs.Indicator className={className} />;
}

export function TabsSeparator({ betweenValues, className }: TabsSeparatorProps) {
  return <HeroUITabs.Separator betweenValues={betweenValues} className={className} />;
}

export function TabsPanel({ children, className, value }: TabsPanelProps) {
  return (
    <HeroUITabs.Content className={className} value={value}>
      {children}
    </HeroUITabs.Content>
  );
}
