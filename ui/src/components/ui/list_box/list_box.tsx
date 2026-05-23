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
  const isDanger = item.variant === "danger";

  const labelNode =
    item.label == null ? null : isValidElement(item.label) ? (
      item.label
    ) : (
      <Label className={clsx(labelClassName, isDanger ? "text-danger" : undefined)}>
        {item.label}
      </Label>
    );

  const descriptionNode =
    item.description == null ? null : isValidElement(item.description) ? (
      item.description
    ) : (
      <Description className={clsx(descriptionClassName, isDanger ? "text-danger/70" : undefined)}>
        {item.description}
      </Description>
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
  onAction?: (key: string) => void,
) {
  const isDanger = item.variant === "danger";

  return (
    <HeroUIListGroup.Item
      className={clsx(itemClassName, item.className, isDanger ? "bg-danger/5" : undefined)}
      key={item.key}
      onPress={onAction ? () => onAction(item.key) : undefined}
    >
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
  onAction?: (key: string) => void,
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
          onAction,
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
  onAction,
  sectionClassName,
  sectionHeaderClassName,
  sections,
  selectionMode,
}: ListBoxProps) {
  void selectionMode;

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
            onAction,
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
            onAction,
          ),
        ));

  return (
    <HeroUIListGroup accessibilityLabel={accessibilityLabel} className={className}>
      {content}
    </HeroUIListGroup>
  );
}

function ListBoxItem({ children, className, onPress, textValue }: ListBoxItemProps) {
  void textValue;

  return (
    <HeroUIListGroup.Item className={className} onPress={onPress}>
      {children}
    </HeroUIListGroup.Item>
  );
}

function ListBoxItemIndicator({ children, className }: ListBoxItemIndicatorProps) {
  return <HeroUIListGroup.ItemSuffix className={className}>{children}</HeroUIListGroup.ItemSuffix>;
}

function ListBoxSection({ accessibilityLabel, children, className }: ListBoxSectionProps) {
  return (
    <HeroUIListGroup accessibilityLabel={accessibilityLabel} className={className}>
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
