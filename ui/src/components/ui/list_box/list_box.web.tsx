import { ListBox as HeroUIListBox } from "@heroui/react";

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
  void nativeProps;
  return (
    <HeroUIListBox aria-label={accessibilityLabel} className={className} {...(webProps as any)}>
      {children}
    </HeroUIListBox>
  );
}

function ListBoxItem({ children, className, nativeProps, textValue, webProps }: ListBoxItemProps) {
  void nativeProps;
  return (
    <HeroUIListBox.Item className={className} textValue={textValue} {...(webProps as any)}>
      {children}
    </HeroUIListBox.Item>
  );
}

function ListBoxItemIndicator({
  children,
  className,
  nativeProps,
  webProps,
}: ListBoxItemIndicatorProps) {
  void nativeProps;
  return (
    <HeroUIListBox.ItemIndicator className={className} {...(webProps as any)}>
      {children}
    </HeroUIListBox.ItemIndicator>
  );
}

function ListBoxSection({ children, className, nativeProps, webProps }: ListBoxSectionProps) {
  void nativeProps;
  return (
    <HeroUIListBox.Section className={className} {...(webProps as any)}>
      {children}
    </HeroUIListBox.Section>
  );
}

export const ListBox = Object.assign(ListBoxRoot, {
  Root: ListBoxRoot,
  Item: ListBoxItem,
  ItemIndicator: ListBoxItemIndicator,
  Section: ListBoxSection,
});
