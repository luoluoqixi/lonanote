import clsx from "clsx";
import { Tabs as HeroUITabs } from "heroui-native";
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
  nativeProps,
  onValueChange,
  panelClassName,
  tabClassName,
  value,
  webProps,
}: TabsProps) {
  void webProps;

  const isVertical = orientation === "vertical";
  const content =
    children ??
    (items ? (
      <>
        <View className={listContainerClassName}>
          <HeroUITabs.List
            className={clsx(`${isVertical ? "flex-col w-full" : ""}`, listClassName)}
          >
            {items.map((item) => (
              <HeroUITabs.Trigger
                className={clsx(tabClassName, item.tabClassName)}
                key={item.value}
                value={item.value}
              >
                <HeroUITabs.Indicator className={indicatorClassName} />
                <Text>{item.label}</Text>
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
      variant={variant}
      value={value}
      {...(nativeProps as any)}
    >
      {content}
    </HeroUITabs>
  );
}

export function TabsListContainer({
  children,
  className,
  nativeProps,
  webProps,
}: TabsListContainerProps) {
  void webProps;
  return (
    <View className={className} {...(nativeProps as any)}>
      {children}
    </View>
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
