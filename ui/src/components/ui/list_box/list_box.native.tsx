import { ListGroup as HeroUIListGroup } from "heroui-native";

import type {
  ListBoxItemIndicatorProps,
  ListBoxItemProps,
  ListBoxProps,
  ListBoxSectionProps,
} from "./types";

function ListBoxRoot({
  accessibilityLabel,
  children,
  className,
  nativeProps,
  webProps,
}: ListBoxProps) {
  void webProps;
  return (
    <HeroUIListGroup
      accessibilityLabel={accessibilityLabel}
      className={className}
      {...(nativeProps as any)}
    >
      {children}
    </HeroUIListGroup>
  );
}

function ListBoxItem({ children, className, nativeProps, textValue, webProps }: ListBoxItemProps) {
  void webProps;
  return (
    <HeroUIListGroup.Item className={className} textValue={textValue} {...(nativeProps as any)}>
      {children}
    </HeroUIListGroup.Item>
  );
}

function ListBoxItemIndicator({
  children,
  className,
  nativeProps,
  webProps,
}: ListBoxItemIndicatorProps) {
  void webProps;
  return (
    <HeroUIListGroup.ItemSuffix className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIListGroup.ItemSuffix>
  );
}

function ListBoxSection({ children, className, nativeProps, webProps }: ListBoxSectionProps) {
  void webProps;
  return (
    <HeroUIListGroup className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIListGroup>
  );
}

export const ListBox = Object.assign(ListBoxRoot, {
  Root: ListBoxRoot,
  Item: ListBoxItem,
  ItemIndicator: ListBoxItemIndicator,
  Section: ListBoxSection,
});
