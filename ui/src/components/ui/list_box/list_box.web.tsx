import { ListBox as HeroUIListBox } from "@heroui/react";
import clsx from "clsx";
import { isValidElement } from "react";
import { View } from "react-native";

import { Description } from "../description";
import { Header } from "../header";
import { Label } from "../label";
import type {
  ListBoxItemData,
  ListBoxItemIndicatorProps,
  ListBoxItemProps,
  ListBoxProps,
  ListBoxSectionData,
  ListBoxSectionProps,
} from "./types";

function renderListBoxLabelContent(
  item: ListBoxItemData,
  descriptionClassName?: string,
  itemContentClassName?: string,
  itemTextContainerClassName?: string,
  labelClassName?: string,
) {
  const labelNode =
    item.label == null ? null : isValidElement(item.label) ? (
      item.label
    ) : (
      <Label className={labelClassName}>{item.label}</Label>
    );

  const descriptionNode =
    item.description == null ? null : isValidElement(item.description) ? (
      item.description
    ) : (
      <Description className={descriptionClassName}>{item.description}</Description>
    );

  return (
    <View className={clsx("flex-row items-start gap-3", itemContentClassName)}>
      {item.startContent}
      <View className={clsx("min-w-0 flex-1 gap-0.5", itemTextContainerClassName)}>
        {labelNode}
        {descriptionNode}
      </View>
      {item.endContent}
    </View>
  );
}

function renderListBoxItem(
  item: ListBoxItemData,
  descriptionClassName?: string,
  itemClassName?: string,
  itemContentClassName?: string,
  itemTextContainerClassName?: string,
  labelClassName?: string,
) {
  return (
    <HeroUIListBox.Item
      className={clsx(itemClassName, item.className)}
      key={item.key}
      textValue={item.textValue ?? (typeof item.label === "string" ? item.label : undefined)}
      variant={item.variant}
    >
      {renderListBoxLabelContent(
        item,
        descriptionClassName,
        itemContentClassName,
        itemTextContainerClassName,
        labelClassName,
      )}
    </HeroUIListBox.Item>
  );
}

function renderListBoxSection(
  section: ListBoxSectionData,
  descriptionClassName?: string,
  itemClassName?: string,
  itemContentClassName?: string,
  itemTextContainerClassName?: string,
  labelClassName?: string,
  sectionClassName?: string,
  sectionHeaderClassName?: string,
) {
  const titleNode =
    section.title == null ? null : isValidElement(section.title) ? (
      section.title
    ) : (
      <Header className={clsx(sectionHeaderClassName, section.headerClassName)}>
        {section.title}
      </Header>
    );

  return (
    <HeroUIListBox.Section
      aria-label={section.accessibilityLabel}
      className={clsx(sectionClassName, section.className)}
      key={section.key}
    >
      {titleNode}
      {section.items.map((item) =>
        renderListBoxItem(
          item,
          descriptionClassName,
          itemClassName,
          itemContentClassName,
          itemTextContainerClassName,
          labelClassName,
        ),
      )}
    </HeroUIListBox.Section>
  );
}

function ListBoxRoot({
  accessibilityLabel,
  children,
  className,
  descriptionClassName,
  itemClassName,
  itemContentClassName,
  itemTextContainerClassName,
  items,
  labelClassName,
  nativeProps,
  sectionClassName,
  sectionHeaderClassName,
  sections,
  webProps,
}: ListBoxProps) {
  void nativeProps;

  const content =
    children ??
    (sections?.length
      ? sections.map((section) =>
          renderListBoxSection(
            section,
            descriptionClassName,
            itemClassName,
            itemContentClassName,
            itemTextContainerClassName,
            labelClassName,
            sectionClassName,
            sectionHeaderClassName,
          ),
        )
      : items?.map((item) =>
          renderListBoxItem(
            item,
            descriptionClassName,
            itemClassName,
            itemContentClassName,
            itemTextContainerClassName,
            labelClassName,
          ),
        ));

  return (
    <HeroUIListBox aria-label={accessibilityLabel} className={className} {...(webProps as any)}>
      {content}
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
