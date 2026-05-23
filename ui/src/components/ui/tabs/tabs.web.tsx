import { Tabs as HeroUITabs } from "@heroui/react";
import clsx from "clsx";

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
  void nativeProps;

  const content =
    children ??
    (items ? (
      <>
        <HeroUITabs.ListContainer className={listContainerClassName}>
          <HeroUITabs.List className={listClassName}>
            {items.map((item) => (
              <HeroUITabs.Tab
                className={clsx(tabClassName, item.tabClassName)}
                id={item.value}
                key={item.value}
              >
                <HeroUITabs.Indicator className={indicatorClassName} />
                {item.label}
              </HeroUITabs.Tab>
            ))}
          </HeroUITabs.List>
        </HeroUITabs.ListContainer>
        {items.map((item) =>
          item.content === undefined ? null : (
            <HeroUITabs.Panel
              className={clsx(panelClassName, item.panelClassName)}
              id={item.value}
              key={item.value}
            >
              {item.content}
            </HeroUITabs.Panel>
          ),
        )}
      </>
    ) : null);

  return (
    <HeroUITabs
      aria-label={accessibilityLabel}
      className={className}
      onSelectionChange={(nextValue) => onValueChange(String(nextValue))}
      selectedKey={value}
      variant={variant}
      {...(webProps as any)}
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
