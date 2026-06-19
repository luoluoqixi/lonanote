import { ChevronRight } from "@tamagui/lucide-icons-2";
import { Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ListGroup } from "../list_group";
import { Select } from "../select";
import { Separator } from "../separator";
import { Switch } from "../switch";
import { Text } from "../text";
import { triggerNativeHaptics, useResolvedNativeHaptics } from "../utils";
import type {
  InsetGroupedListActionItemProps,
  InsetGroupedListCustomItemData,
  InsetGroupedListItemData,
  InsetGroupedListItemProps,
  InsetGroupedListNavigationItemProps,
  InsetGroupedListProps,
  InsetGroupedListSectionData,
  InsetGroupedListSectionProps,
  InsetGroupedListSelectItemProps,
  InsetGroupedListSwitchItemProps,
} from "./types";

function isTextNode(node: ReactNode) {
  return typeof node === "string" || typeof node === "number";
}

function resolveItemKey(item: InsetGroupedListItemData, index: number) {
  if (item.key) {
    return item.key;
  }

  if ("title" in item && isTextNode(item.title)) {
    return String(item.title);
  }

  return `inset-grouped-list-item-${index}`;
}

function resolveSectionKey(section: InsetGroupedListSectionData, index: number) {
  if (section.key) {
    return section.key;
  }

  if (isTextNode(section.title)) {
    return String(section.title);
  }

  return `inset-grouped-list-section-${index}`;
}

function omitInternalItemFields<T extends InsetGroupedListItemData>(item: T) {
  const { key, kind, ...itemProps } = item;
  void key;
  void kind;

  return itemProps;
}

type RowShellProps = {
  children: ReactNode;
  disabled?: boolean;
  nativeHaptics?: InsetGroupedListItemProps["nativeHaptics"];
  onPress?: () => void;
};

function RowShell({ children, disabled, nativeHaptics, onPress }: RowShellProps) {
  const resolvedNativeHaptics = useResolvedNativeHaptics(nativeHaptics);

  if (!onPress) {
    return <View style={styles.rowShell}>{children}</View>;
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        onPress();
        triggerNativeHaptics(resolvedNativeHaptics);
      }}
      style={({ pressed }) => [
        styles.pressable,
        pressed && !disabled ? styles.pressablePressed : null,
        disabled ? styles.pressableDisabled : null,
      ]}
    >
      <View style={styles.rowShell}>{children}</View>
    </Pressable>
  );
}

type StandardRowProps = InsetGroupedListActionItemProps & {
  trailingControl?: ReactNode;
};

function StandardRow({
  chevron,
  disabled,
  leading,
  nativeHaptics,
  onPress,
  subtitle,
  title,
  trailing,
  trailingControl,
  value,
}: StandardRowProps) {
  return (
    <RowShell disabled={disabled} nativeHaptics={nativeHaptics} onPress={onPress}>
      <View style={styles.rowContent}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <View style={styles.textColumn}>
          {title != null ? (
            <Text fontSize="$5" fontWeight="500" numberOfLines={subtitle ? 2 : 1}>
              {title}
            </Text>
          ) : null}
          {subtitle != null ? (
            <Text color="$color10" fontSize="$3" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {value != null ? (
          <Text color="$color10" fontSize="$4" numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {trailingControl ?? trailing}
        {chevron ? <ChevronRight color="$color10" size={18} /> : null}
      </View>
    </RowShell>
  );
}

export function FallbackInsetGroupedListItem({
  children,
  disabled,
  nativeHaptics,
  onPress,
}: InsetGroupedListItemProps) {
  return (
    <RowShell disabled={disabled} nativeHaptics={nativeHaptics} onPress={onPress}>
      <View style={styles.customContent}>{children}</View>
    </RowShell>
  );
}

export function FallbackInsetGroupedListActionItem(props: InsetGroupedListActionItemProps) {
  return <StandardRow {...props} chevron={props.chevron} />;
}

export function FallbackInsetGroupedListNavigationItem(props: InsetGroupedListNavigationItemProps) {
  return <StandardRow {...props} chevron={props.chevron ?? true} />;
}

export function FallbackInsetGroupedListSwitchItem({
  switchProps,
  ...itemProps
}: InsetGroupedListSwitchItemProps) {
  return (
    <StandardRow
      {...itemProps}
      trailingControl={<Switch {...switchProps} native={true} />}
      value={undefined}
    />
  );
}

export function FallbackInsetGroupedListSelectItem({
  selectProps,
  ...itemProps
}: InsetGroupedListSelectItemProps) {
  return (
    <StandardRow
      {...itemProps}
      trailingControl={<Select {...selectProps} native={true} nativeTrigger={true} />}
      value={undefined}
    />
  );
}

export function FallbackInsetGroupedListCustomItem({
  children,
  disabled,
  nativeHaptics,
  onPress,
  render,
}: InsetGroupedListCustomItemData) {
  const content = render?.() ?? children;

  return (
    <RowShell disabled={disabled} nativeHaptics={nativeHaptics} onPress={onPress}>
      <View style={styles.customContent}>{content}</View>
    </RowShell>
  );
}

export function renderFallbackDataItem(item: InsetGroupedListItemData) {
  switch (item.kind) {
    case "action":
      return <FallbackInsetGroupedListActionItem {...omitInternalItemFields(item)} />;
    case "navigation":
      return <FallbackInsetGroupedListNavigationItem {...omitInternalItemFields(item)} />;
    case "switch":
      return <FallbackInsetGroupedListSwitchItem {...omitInternalItemFields(item)} />;
    case "select":
      return <FallbackInsetGroupedListSelectItem {...omitInternalItemFields(item)} />;
    case "custom":
      return <FallbackInsetGroupedListCustomItem {...omitInternalItemFields(item)} />;
    default:
      return null;
  }
}

export function FallbackInsetGroupedListSection({
  children,
  footer,
  items,
  title,
}: InsetGroupedListSectionProps) {
  return (
    <View style={styles.section}>
      {title != null ? (
        <View style={styles.sectionLabel}>
          <Text color="$color10" fontSize="$3">
            {title}
          </Text>
        </View>
      ) : null}
      <ListGroup rounded="$4" self="stretch">
        {children ??
          items?.map((item, index) => (
            <Fragment key={resolveItemKey(item, index)}>
              {index > 0 ? <Separator /> : null}
              <ListGroup.GroupItem>{renderFallbackDataItem(item)}</ListGroup.GroupItem>
            </Fragment>
          ))}
      </ListGroup>
      {footer != null ? (
        <View style={styles.sectionLabel}>
          <Text color="$color10" fontSize="$2">
            {footer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function FallbackInsetGroupedList({
  children,
  contentContainerStyle,
  sectionGap = 18,
  sections,
}: InsetGroupedListProps) {
  return (
    <View style={[styles.root, { gap: sectionGap }, contentContainerStyle]}>
      {children ??
        sections?.map((section, index) => (
          <FallbackInsetGroupedListSection
            footer={section.footer}
            items={section.items}
            key={resolveSectionKey(section, index)}
            title={section.title}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  customContent: {
    flex: 1,
  },
  leading: {
    alignItems: "center",
    marginRight: 12,
  },
  pressable: {
    flex: 1,
  },
  pressableDisabled: {
    opacity: 0.5,
  },
  pressablePressed: {
    backgroundColor: "rgba(128, 128, 128, 0.08)",
  },
  root: {
    width: "100%",
  },
  rowContent: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  rowShell: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    paddingHorizontal: 16,
  },
  textColumn: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
});
