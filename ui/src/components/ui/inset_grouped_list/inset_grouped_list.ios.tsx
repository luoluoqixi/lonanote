import {
  Button,
  HStack,
  Host,
  Image,
  List,
  Picker,
  Section,
  Spacer,
  Text as SwiftText,
  Toggle,
  VStack,
} from "@expo/ui/swift-ui";
import {
  contentShape,
  foregroundStyle,
  frame,
  headerProminence,
  listRowInsets,
  listRowSeparator,
  listSectionSpacing,
  listStyle,
  pickerStyle,
  scrollContentBackground,
  shapes,
  disabled as swiftDisabled,
  tag,
} from "@expo/ui/swift-ui/modifiers";
import type { ReactNode } from "react";
import { PlatformColor, View } from "react-native";

import {
  FallbackInsetGroupedList,
  FallbackInsetGroupedListActionItem,
  FallbackInsetGroupedListItem,
  FallbackInsetGroupedListNavigationItem,
  FallbackInsetGroupedListSection,
  FallbackInsetGroupedListSelectItem,
  FallbackInsetGroupedListSwitchItem,
} from "./fallback";
import type {
  InsetGroupedListActionItemProps,
  InsetGroupedListItemBaseProps,
  InsetGroupedListItemData,
  InsetGroupedListProps,
  InsetGroupedListSectionData,
  InsetGroupedListSelectItemProps,
  InsetGroupedListSwitchItemProps,
} from "./types";

const IOS_PRIMARY_TEXT_COLOR = PlatformColor("label");
const IOS_SECONDARY_TEXT_COLOR = PlatformColor("secondaryLabel");
const IOS_TERTIARY_TEXT_COLOR = PlatformColor("tertiaryLabel");

function isTextNode(node: ReactNode) {
  return typeof node === "string" || typeof node === "number";
}

function toTextValue(node: ReactNode) {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  return null;
}

function resolveSectionKey(section: InsetGroupedListSectionData, index: number) {
  if (section.key) {
    return section.key;
  }

  const title = toTextValue(section.title);

  if (title) {
    return title;
  }

  return `inset-grouped-list-ios-section-${index}`;
}

function resolveItemKey(item: InsetGroupedListItemData, index: number) {
  if (item.key) {
    return item.key;
  }

  if ("title" in item) {
    const title = toTextValue(item.title);

    if (title) {
      return title;
    }
  }

  return `inset-grouped-list-ios-item-${index}`;
}

function omitInternalItemFields<T extends InsetGroupedListItemData>(item: T) {
  const { key, kind, ...itemProps } = item;
  void key;
  void kind;

  return itemProps;
}

function resolveSelectOptions(props: InsetGroupedListSelectItemProps["selectProps"]) {
  const groups = props.itemGroups;

  if (groups && groups.length > 0) {
    return groups.flatMap((group) => group.items);
  }

  return props.options ?? props.items ?? [];
}

function isNativeCapableSelectItem(item: InsetGroupedListSelectItemProps) {
  const options = resolveSelectOptions(item.selectProps);

  return options.every(
    (option) =>
      option.startContent == null &&
      option.endContent == null &&
      typeof option.label === "string" &&
      typeof option.value === "string",
  );
}

function isNativeCapableItem(item: InsetGroupedListItemData) {
  if (item.kind === "custom") {
    return false;
  }

  if (
    item.leading != null ||
    item.trailing != null ||
    !isTextNode(item.title) ||
    (item.subtitle != null && !isTextNode(item.subtitle)) ||
    (item.value != null && !isTextNode(item.value))
  ) {
    return false;
  }

  if (item.kind === "select") {
    return isNativeCapableSelectItem(item);
  }

  return true;
}

function isNativeCapableSection(section: InsetGroupedListSectionData) {
  if (
    (section.title != null && !isTextNode(section.title)) ||
    (section.footer != null && !isTextNode(section.footer))
  ) {
    return false;
  }

  return section.items.every(isNativeCapableItem);
}

function NativeRowLabel({
  subtitle,
  title,
}: Pick<InsetGroupedListItemBaseProps, "subtitle" | "title">) {
  const titleText = toTextValue(title);
  const subtitleText = toTextValue(subtitle);

  return (
    <VStack alignment="leading" spacing={subtitleText ? 2 : 0}>
      {titleText ? (
        <SwiftText modifiers={[foregroundStyle(IOS_PRIMARY_TEXT_COLOR)]}>{titleText}</SwiftText>
      ) : null}
      {subtitleText ? (
        <SwiftText modifiers={[foregroundStyle(IOS_SECONDARY_TEXT_COLOR)]}>
          {subtitleText}
        </SwiftText>
      ) : null}
    </VStack>
  );
}

function NativeActionRow({
  chevron,
  disabled,
  isLastInSection,
  onPress,
  subtitle,
  title,
  value,
}: InsetGroupedListActionItemProps & { isLastInSection?: boolean }) {
  const valueText = toTextValue(value);
  const separatorModifiers = [
    listRowSeparator("hidden", "top"),
    listRowSeparator(isLastInSection ? "hidden" : "visible", "bottom"),
  ];
  const rowContent = (
    <HStack
      alignment="center"
      modifiers={[contentShape(shapes.rectangle()), frame({ minHeight: 20 })]}
      spacing={12}
    >
      <NativeRowLabel subtitle={subtitle} title={title} />
      <Spacer />
      {valueText ? (
        <SwiftText modifiers={[foregroundStyle(IOS_SECONDARY_TEXT_COLOR)]}>{valueText}</SwiftText>
      ) : null}
      {chevron ? (
        <Image
          modifiers={[foregroundStyle(IOS_TERTIARY_TEXT_COLOR)]}
          size={14}
          systemName="chevron.right"
        />
      ) : null}
    </HStack>
  );

  if (!onPress) {
    return (
      <HStack
        alignment="center"
        modifiers={[
          listRowInsets({ bottom: 12, leading: 16, top: 12, trailing: 16 }),
          ...separatorModifiers,
          ...(disabled ? [swiftDisabled(true)] : []),
        ]}
        spacing={12}
      >
        {rowContent}
      </HStack>
    );
  }

  return (
    <Button
      modifiers={[
        listRowInsets({ bottom: 12, leading: 16, top: 12, trailing: 16 }),
        ...separatorModifiers,
        ...(disabled ? [swiftDisabled(true)] : []),
      ]}
      onPress={onPress}
    >
      {rowContent}
    </Button>
  );
}

function NativeSwitchRow({
  disabled,
  isLastInSection,
  subtitle,
  switchProps,
  title,
}: InsetGroupedListSwitchItemProps & { isLastInSection?: boolean }) {
  return (
    <Toggle
      isOn={switchProps.checked ?? switchProps.defaultChecked ?? false}
      label={toTextValue(title) ?? ""}
      modifiers={[
        listRowInsets({ bottom: 12, leading: 16, top: 12, trailing: 16 }),
        listRowSeparator("hidden", "top"),
        listRowSeparator(isLastInSection ? "hidden" : "visible", "bottom"),
        ...(disabled || switchProps.disabled ? [swiftDisabled(true)] : []),
      ]}
      onIsOnChange={(nextValue) => switchProps.onCheckedChange?.(nextValue)}
    >
      <NativeRowLabel subtitle={subtitle} title={title} />
    </Toggle>
  );
}

function NativeSelectRow({
  disabled,
  isLastInSection,
  selectProps,
  subtitle,
  title,
}: InsetGroupedListSelectItemProps & { isLastInSection?: boolean }) {
  const options = resolveSelectOptions(selectProps);
  const selectedValue = typeof selectProps.value === "string" ? selectProps.value : null;

  return (
    <Picker
      label={<NativeRowLabel subtitle={subtitle} title={title} />}
      modifiers={[
        pickerStyle("navigationLink"),
        listRowInsets({ bottom: 12, leading: 16, top: 12, trailing: 16 }),
        listRowSeparator("hidden", "top"),
        listRowSeparator(isLastInSection ? "hidden" : "visible", "bottom"),
        ...(disabled || selectProps.disabled || selectProps.isDisabled
          ? [swiftDisabled(true)]
          : []),
      ]}
      onSelectionChange={(nextValue) => {
        selectProps.onValueChange?.(typeof nextValue === "string" ? nextValue : null);
      }}
      selection={selectedValue}
    >
      {options.map((option) => (
        <SwiftText key={option.value} modifiers={[tag(option.value)]}>
          {option.label}
        </SwiftText>
      ))}
    </Picker>
  );
}

function renderNativeItem(
  item: InsetGroupedListItemData,
  index: number,
  items: InsetGroupedListItemData[],
) {
  const key = resolveItemKey(item, index);
  const isLastInSection = index === items.length - 1;

  switch (item.kind) {
    case "action":
      return (
        <NativeActionRow
          key={key}
          {...omitInternalItemFields(item)}
          chevron={item.chevron}
          isLastInSection={isLastInSection}
        />
      );
    case "navigation":
      return (
        <NativeActionRow
          key={key}
          {...omitInternalItemFields(item)}
          chevron={item.chevron ?? true}
          isLastInSection={isLastInSection}
        />
      );
    case "switch":
      return (
        <NativeSwitchRow
          key={key}
          {...omitInternalItemFields(item)}
          isLastInSection={isLastInSection}
        />
      );
    case "select":
      return (
        <NativeSelectRow
          key={key}
          {...omitInternalItemFields(item)}
          isLastInSection={isLastInSection}
        />
      );
    case "custom":
    default:
      return null;
  }
}

function renderNativeSection(section: InsetGroupedListSectionData, index: number) {
  return (
    <Section
      footer={toTextValue(section.footer) ?? undefined}
      key={resolveSectionKey(section, index)}
      modifiers={[headerProminence("standard")]}
      title={toTextValue(section.title) ?? undefined}
    >
      {section.items.map((item, index, items) => renderNativeItem(item, index, items))}
    </Section>
  );
}

function InsetGroupedListRoot({
  children,
  contentContainerStyle,
  sectionGap,
  sections,
}: InsetGroupedListProps) {
  if (children || !sections) {
    return (
      <FallbackInsetGroupedList
        contentContainerStyle={contentContainerStyle}
        sectionGap={sectionGap}
      >
        {children}
      </FallbackInsetGroupedList>
    );
  }

  const shouldUseNativeList = sections.every(isNativeCapableSection);

  if (shouldUseNativeList) {
    return (
      <View style={[styles.nativeRoot, contentContainerStyle as any]}>
        <Host style={styles.nativeHost} useViewportSizeMeasurement>
          <List
            modifiers={[
              listStyle("insetGrouped"),
              listSectionSpacing("compact"),
              scrollContentBackground("hidden"),
            ]}
          >
            {sections.map(renderNativeSection)}
          </List>
        </Host>
      </View>
    );
  }

  return (
    <View style={contentContainerStyle as any}>
      <FallbackInsetGroupedList sectionGap={sectionGap ?? 18}>
        {sections.map((section, index) => (
          <FallbackInsetGroupedListSection
            footer={section.footer}
            items={section.items}
            key={resolveSectionKey(section, index)}
            title={section.title}
          />
        ))}
      </FallbackInsetGroupedList>
    </View>
  );
}

export const InsetGroupedList = Object.assign(InsetGroupedListRoot, {
  ActionItem: FallbackInsetGroupedListActionItem,
  Item: FallbackInsetGroupedListItem,
  NavigationItem: FallbackInsetGroupedListNavigationItem,
  Section: FallbackInsetGroupedListSection,
  SelectItem: FallbackInsetGroupedListSelectItem,
  SwitchItem: FallbackInsetGroupedListSwitchItem,
});

const styles = {
  nativeHost: {
    flex: 1,
    minHeight: 1,
    width: "100%",
  } as const,
  nativeRoot: {
    flex: 1,
    minHeight: 1,
    width: "100%",
  } as const,
};
