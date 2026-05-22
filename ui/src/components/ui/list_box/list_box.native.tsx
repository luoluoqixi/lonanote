import clsx from "clsx";
import { ListGroup as HeroUIListGroup } from "heroui-native";
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
    <HeroUIListGroup.Item className={clsx(itemClassName, item.className)} key={item.key}>
      {renderListBoxLabelContent(
        item,
        descriptionClassName,
        itemContentClassName,
        itemTextContainerClassName,
        labelClassName,
      )}
    </HeroUIListGroup.Item>
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
    <HeroUIListGroup
      accessibilityLabel={section.accessibilityLabel}
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
    </HeroUIListGroup>
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
  void webProps;

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
    <HeroUIListGroup
      accessibilityLabel={accessibilityLabel}
      className={className}
      {...(nativeProps as any)}
    >
      {content}
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
