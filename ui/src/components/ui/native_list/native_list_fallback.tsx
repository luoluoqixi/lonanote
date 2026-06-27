import { HeaderHeightContext } from "@react-navigation/elements";
import { Check, ChevronRight, ChevronsUpDown } from "@tamagui/lucide-icons-2";
import {
  Children,
  type ComponentType,
  type ReactElement,
  type ReactNode,
  isValidElement,
  useContext,
  useMemo,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "tamagui";

import { os } from "@/api/common/platform";

import { FlashList, type ListRenderItemInfo } from "../flash_list";
import { Select } from "../select";
import {
  getTrueSheetScrollBottomPadding,
  getTrueSheetScrollIndicatorBottomInset,
} from "../sheet/native_sheet/true_sheet/sheet_scroll_layout";
import { useTrueSheetScrollLayout } from "../sheet/native_sheet/true_sheet/true_sheet_scroll_context";
import { Switch } from "../switch";
import { SizableText, Text } from "../text";
import { triggerNativeHaptics, useResolvedNativeHaptics } from "../utils";
import type {
  NativeListActionItemProps,
  NativeListButtonItemProps,
  NativeListCustomItemProps,
  NativeListItemBaseProps,
  NativeListItemProps,
  NativeListNavigationItemProps,
  NativeListRootProps,
  NativeListSectionProps,
  NativeListSelectItemProps,
  NativeListSwitchItemProps,
} from "./types";

type RowContainerProps = {
  children: ReactNode;
  disabled?: boolean;
  nativeHaptics?: NativeListItemBaseProps["nativeHaptics"];
  onPress?: () => void;
};

type FallbackListEntry =
  | {
      key: string;
      sectionKey: string;
      title: ReactNode;
      type: "sectionHeader";
    }
  | {
      key: string;
      nativeScrollId?: string | number;
      renderRow: () => ReactElement | null;
      rowType:
        | "actionRow"
        | "buttonRow"
        | "customRow"
        | "itemRow"
        | "navigationRow"
        | "selectRow"
        | "switchRow"
        | "unknownRow";
      sectionKey: string;
      type: "row";
    }
  | {
      footer: ReactNode;
      key: string;
      sectionKey: string;
      type: "sectionFooter";
    };

function FallbackRowContainer({ children, disabled, nativeHaptics, onPress }: RowContainerProps) {
  const resolvedHaptics = useResolvedNativeHaptics(nativeHaptics);
  const theme = useTheme();

  const getRowBackground = (pressed = false) => ({
    backgroundColor:
      pressed && !disabled
        ? (theme.backgroundPress?.val ?? theme.backgroundHover?.val ?? theme.background?.val)
        : theme.background?.val,
  });

  if (onPress == null) {
    return (
      <View
        style={[styles.rowContainer, getRowBackground(), disabled ? styles.disabledContent : null]}
      >
        {children}
      </View>
    );
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        onPress();
        triggerNativeHaptics(resolvedHaptics);
      }}
      style={styles.pressable}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.rowContainer,
            getRowBackground(pressed),
            disabled ? styles.disabledContent : null,
          ]}
        >
          {children}
        </View>
      )}
    </Pressable>
  );
}

type NativeListRowProps = NativeListItemBaseProps & {
  iconAfter?: ReactNode;
  titleColor?: string | false;
};

function renderTitleNode(
  title: ReactNode,
  titleColor: string | false | undefined,
  textAlign: "center" | "left" | "right",
) {
  if (title == null || typeof title === "boolean") {
    return null;
  }

  if (typeof title === "string" || typeof title === "number") {
    const titleStyle = {
      ...(titleColor ? { color: titleColor } : null),
      textAlign,
    };

    return (
      <SizableText numberOfLines={1} size="$true" style={titleStyle}>
        {title}
      </SizableText>
    );
  }

  return title;
}

function renderSubtitleNode(subtitle: ReactNode) {
  if (subtitle == null || typeof subtitle === "boolean") {
    return null;
  }

  if (typeof subtitle === "string" || typeof subtitle === "number") {
    return (
      <Text color="$color10" fontSize="$3" numberOfLines={4}>
        {subtitle}
      </Text>
    );
  }

  return subtitle;
}

function renderValueNode(value: ReactNode) {
  if (value == null || typeof value === "boolean") {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    return (
      <Text color="$color" fontSize="$5" numberOfLines={1} opacity={0.58}>
        {value}
      </Text>
    );
  }

  return value;
}

function NativeListRow({
  chevron = false,
  disabled,
  iconAfter,
  nativeHaptics,
  onPress,
  selected = false,
  subtitle,
  title,
  titleAlign,
  titleColor,
  value,
}: NativeListRowProps) {
  const titleAlignment =
    titleAlign === "center" ? "center" : titleAlign === "right" ? "flex-end" : "flex-start";
  const textAlign = titleAlign === "center" ? "center" : titleAlign === "right" ? "right" : "left";
  const titleNode = renderTitleNode(title, titleColor, textAlign);
  const subtitleNode = renderSubtitleNode(subtitle);
  const valueNode = renderValueNode(value);

  return (
    <FallbackRowContainer disabled={disabled} nativeHaptics={nativeHaptics} onPress={onPress}>
      <View style={styles.rowContent}>
        <View style={[styles.textColumn, { alignItems: titleAlignment }]}>
          {titleNode}
          {subtitleNode}
        </View>
        <View style={styles.iconAfterRow}>
          {valueNode}
          {selected ? <Check color="$accent10" size={18} /> : null}
          {iconAfter}
          {chevron ? <ChevronRight color="$color" opacity={0.58} size={18} /> : null}
        </View>
      </View>
    </FallbackRowContainer>
  );
}

type PressRowProps = NativeListItemBaseProps & {
  trailingControl?: ReactNode;
};

function FallbackPressRow({ trailingControl, ...props }: PressRowProps) {
  return <NativeListRow {...props} iconAfter={trailingControl} />;
}

function getSelectedLabel(selectProps: NativeListSelectItemProps["selectProps"]) {
  const selectedValue = selectProps.value ?? selectProps.defaultValue;
  const items = [
    ...(selectProps.items ?? selectProps.options ?? []),
    ...(selectProps.itemGroups?.flatMap((group) => group.items) ?? []),
  ];

  return (
    items.find((item) => item.value === selectedValue)?.label ??
    (typeof selectProps.placeholder === "string" ? selectProps.placeholder : "")
  );
}

function getNodeKey(node: ReactNode, fallback: string) {
  if (isValidElement(node) && node.key != null) {
    return String(node.key);
  }

  return fallback;
}

function getNativeScrollId(node: ReactNode) {
  if (!isValidElement<NativeListItemBaseProps>(node)) {
    return undefined;
  }

  return node.props.nativeScrollId;
}

function isNativeListSectionType(type: ReactElement["type"]) {
  if (type === NativeListSection) {
    return true;
  }

  return typeof type === "function" && type.name === "NativeListSection";
}

function isNativeListSectionElement(node: ReactNode): node is ReactElement<NativeListSectionProps> {
  return isValidElement<NativeListSectionProps>(node) && isNativeListSectionType(node.type);
}

function isNativeListElementType<Props>(
  node: ReactNode,
  type: ComponentType<Props>,
): node is ReactElement<Props> {
  return isValidElement<Props>(node) && node.type === type;
}

function createFallbackRowEntry(
  child: ReactNode,
  key: string,
  sectionKey: string,
): FallbackListEntry {
  if (isNativeListElementType(child, NativeListActionItem)) {
    return {
      key,
      nativeScrollId: child.props.nativeScrollId,
      renderRow: () => <NativeListActionItem {...child.props} />,
      rowType: "actionRow",
      sectionKey,
      type: "row",
    };
  }

  if (isNativeListElementType(child, NativeListNavigationItem)) {
    return {
      key,
      nativeScrollId: child.props.nativeScrollId,
      renderRow: () => <NativeListNavigationItem {...child.props} />,
      rowType: "navigationRow",
      sectionKey,
      type: "row",
    };
  }

  if (isNativeListElementType(child, NativeListSwitchItem)) {
    return {
      key,
      nativeScrollId: child.props.nativeScrollId,
      renderRow: () => <NativeListSwitchItem {...child.props} />,
      rowType: "switchRow",
      sectionKey,
      type: "row",
    };
  }

  if (isNativeListElementType(child, NativeListSelectItem)) {
    return {
      key,
      nativeScrollId: child.props.nativeScrollId,
      renderRow: () => <NativeListSelectItem {...child.props} />,
      rowType: "selectRow",
      sectionKey,
      type: "row",
    };
  }

  if (isNativeListElementType(child, NativeListButtonItem)) {
    return {
      key,
      nativeScrollId: child.props.nativeScrollId,
      renderRow: () => <NativeListButtonItem {...child.props} />,
      rowType: "buttonRow",
      sectionKey,
      type: "row",
    };
  }

  if (isNativeListElementType(child, NativeListItem)) {
    return {
      key,
      nativeScrollId: child.props.nativeScrollId,
      renderRow: () => <NativeListItem {...child.props} />,
      rowType: "itemRow",
      sectionKey,
      type: "row",
    };
  }

  if (isNativeListElementType(child, NativeListCustomItem)) {
    return {
      key,
      nativeScrollId: getNativeScrollId(child),
      renderRow: () => <NativeListCustomItem {...child.props} />,
      rowType: "customRow",
      sectionKey,
      type: "row",
    };
  }

  return {
    key,
    nativeScrollId: getNativeScrollId(child),
    renderRow: () => (isValidElement(child) ? child : null),
    rowType: "unknownRow",
    sectionKey,
    type: "row",
  };
}

function FallbackListRowFrame({ children }: { children: ReactNode }) {
  return (
    <View collapsable={false} style={styles.rowFrame}>
      {children}
    </View>
  );
}

function appendSectionEntries(
  entries: FallbackListEntry[],
  sectionProps: NativeListSectionProps,
  sectionKey: string,
) {
  const sectionChildren = Children.toArray(sectionProps.children);
  const hasSectionContent =
    sectionProps.title != null || sectionChildren.length > 0 || sectionProps.footer != null;

  if (!hasSectionContent) {
    return;
  }

  if (sectionProps.title != null) {
    entries.push({
      key: `${sectionKey}-header`,
      sectionKey,
      title: sectionProps.title,
      type: "sectionHeader",
    });
  }

  sectionChildren.forEach((child, index) => {
    entries.push(
      createFallbackRowEntry(
        child,
        `${sectionKey}-row-${getNodeKey(child, String(index))}`,
        sectionKey,
      ),
    );
  });

  if (sectionProps.footer != null) {
    entries.push({
      footer: sectionProps.footer,
      key: `${sectionKey}-footer`,
      sectionKey,
      type: "sectionFooter",
    });
  }
}

function createFallbackListEntries(children: ReactNode) {
  const entries: FallbackListEntry[] = [];

  Children.toArray(children).forEach((child, index) => {
    if (isNativeListSectionElement(child)) {
      appendSectionEntries(entries, child.props, getNodeKey(child, `section-${index}`));
      return;
    }

    entries.push(
      createFallbackRowEntry(
        child,
        `direct-row-${getNodeKey(child, String(index))}`,
        `direct-${index}`,
      ),
    );
  });

  return entries;
}

function renderFallbackListEntry({
  item,
}: ListRenderItemInfo<FallbackListEntry>): ReactElement | null {
  switch (item.type) {
    case "sectionHeader":
      return (
        <View style={styles.sectionLabel}>
          {typeof item.title === "string" || typeof item.title === "number" ? (
            <Text color="$color10" fontSize="$3">
              {item.title}
            </Text>
          ) : (
            item.title
          )}
        </View>
      );
    case "row":
      return <FallbackListRowFrame>{item.renderRow()}</FallbackListRowFrame>;
    case "sectionFooter":
      return (
        <View style={styles.sectionFooter}>
          {typeof item.footer === "string" || typeof item.footer === "number" ? (
            <Text color="$color10" fontSize="$3">
              {item.footer}
            </Text>
          ) : (
            item.footer
          )}
        </View>
      );
  }
}

function FallbackListItemSeparator({
  leadingItem,
  trailingItem,
}: {
  leadingItem?: FallbackListEntry;
  trailingItem?: FallbackListEntry;
}) {
  if (leadingItem == null || trailingItem == null) {
    return null;
  }

  if (leadingItem.sectionKey !== trailingItem.sectionKey) {
    return <View style={styles.sectionSpacer} />;
  }

  return null;
}

function renderStaticEntries(entries: FallbackListEntry[]) {
  return entries.map((entry, index) => (
    <View key={entry.key}>{renderFallbackListEntry({ item: entry, index, target: "Cell" })}</View>
  ));
}

function getEntryType(item: FallbackListEntry) {
  return item.type === "row" ? item.rowType : item.type;
}

function getEntryKey(item: FallbackListEntry) {
  return item.key;
}

function getInitialScrollIndex(
  entries: FallbackListEntry[],
  initialScrollTarget?: string | number,
) {
  if (initialScrollTarget == null) {
    return undefined;
  }

  const index = entries.findIndex((entry) => {
    return entry.type === "row" && entry.nativeScrollId === initialScrollTarget;
  });

  return index >= 0 ? index : undefined;
}

export function NativeListActionItem(props: NativeListActionItemProps) {
  return <FallbackPressRow {...props} chevron={props.chevron} />;
}

export function NativeListNavigationItem(props: NativeListNavigationItemProps) {
  return <FallbackPressRow {...props} chevron={props.chevron ?? true} />;
}

export function NativeListSwitchItem({ switchProps, ...itemProps }: NativeListSwitchItemProps) {
  const checked = switchProps.checked ?? switchProps.defaultChecked ?? false;
  const disabled = itemProps.disabled || switchProps.disabled;

  return (
    <NativeListRow
      {...itemProps}
      disabled={disabled}
      nativeHaptics={itemProps.nativeHaptics ?? true}
      onPress={() => switchProps.onCheckedChange?.(!checked)}
      iconAfter={
        <View style={styles.trailingControl}>
          <Switch
            {...switchProps}
            native
            onPress={(event) => {
              switchProps.onPress?.(event);
              event.stopPropagation();
            }}
          />
        </View>
      }
    />
  );
}

export function NativeListButtonItem({
  title,
  onPress,
  disabled,
  titleAlign = "center",
  btnTint,
  ...itemProps
}: NativeListButtonItemProps) {
  const theme = useTheme();
  const defaultColor = theme.accent10.val;
  const resolveColor = btnTint ?? defaultColor;

  return (
    <NativeListItem
      {...itemProps}
      btnTint={resolveColor}
      titleAlign={titleAlign}
      title={title}
      disabled={disabled}
      onPress={onPress}
    />
  );
}

export function NativeListItem({
  title,
  onPress,
  disabled,
  titleAlign,
  btnTint,
  ...itemProps
}: NativeListItemProps) {
  return (
    <NativeListRow
      {...itemProps}
      btnTint={btnTint}
      titleAlign={titleAlign}
      titleColor={typeof btnTint !== "boolean" ? btnTint : undefined}
      title={title}
      disabled={disabled}
      onPress={onPress}
    />
  );
}

export function NativeListSelectItem({ selectProps, ...itemProps }: NativeListSelectItemProps) {
  const disabled = itemProps.disabled || selectProps.disabled || selectProps.isDisabled;
  const selectedLabel = getSelectedLabel(selectProps);

  return (
    <Select
      {...selectProps}
      disabled={disabled}
      native
      nativeHaptics={selectProps.nativeHaptics ?? itemProps.nativeHaptics ?? false}
      nativeTrigger
      nativeTriggerContent={
        <NativeListRow
          {...itemProps}
          disabled={disabled}
          iconAfter={
            <View style={styles.selectValue}>
              <Text color="$color" fontSize="$4" numberOfLines={1} opacity={0.58}>
                {selectedLabel}
              </Text>
              <ChevronsUpDown color="$color" opacity={0.58} size={14} />
            </View>
          }
        />
      }
      triggerProps={{
        pressStyle: {
          backgroundColor: "$backgroundPress",
        },
      }}
    />
  );
}

export function NativeListCustomItem({
  children,
  disabled,
  nativeHaptics,
  onPress,
}: NativeListCustomItemProps) {
  return (
    <FallbackRowContainer disabled={disabled} nativeHaptics={nativeHaptics} onPress={onPress}>
      <View style={styles.customRowContent}>{children}</View>
    </FallbackRowContainer>
  );
}

export function NativeListSection({ children, footer, title }: NativeListSectionProps) {
  const entries = createFallbackListEntries(
    <NativeListSection footer={footer} title={title}>
      {children}
    </NativeListSection>,
  );

  return <View style={styles.staticSection}>{renderStaticEntries(entries)}</View>;
}

export function NativeListRoot({
  children,
  contentContainerStyle,
  contentMarginBottom,
  contentMarginTop,
  initialScrollTarget,
  native: _native,
  scrollable = true,
  style,
  ...rest
}: NativeListRootProps) {
  void _native;
  const {
    alwaysBounceVertical,
    contentInset,
    contentInsetAdjustmentBehavior,
    contentOffset,
    keyboardShouldPersistTaps,
    maintainVisibleContentPosition: _maintainVisibleContentPosition,
    nestedScrollEnabled,
    scrollIndicatorInsets,
    showsVerticalScrollIndicator,
    ...scrollViewProps
  } = rest;
  void _maintainVisibleContentPosition;
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const insets = useSafeAreaInsets();
  const entries = useMemo(() => createFallbackListEntries(children), [children]);
  const initialScrollIndex = useMemo(
    () => getInitialScrollIndex(entries, initialScrollTarget),
    [entries, initialScrollTarget],
  );
  const {
    active: insideTrueSheet,
    automaticContentInsetAdjustment,
    insetAdjustment,
    nativeScrollInsetsApplied,
  } = useTrueSheetScrollLayout();
  const theme = useTheme();
  const rootBackground = { backgroundColor: theme.background.val };

  const bottomPadding = insideTrueSheet
    ? getTrueSheetScrollBottomPadding({
        insetAdjustment,
        nativeScrollInsetsApplied,
        safeAreaBottom: insets.bottom,
      })
    : undefined;
  const indicatorBottomInset = insideTrueSheet
    ? getTrueSheetScrollIndicatorBottomInset({
        automaticContentInsetAdjustment,
        nativeScrollInsetsApplied,
        safeAreaBottom: insets.bottom,
      })
    : undefined;
  const shouldUseManualHeaderSpacing =
    !insideTrueSheet &&
    os() === "ios" &&
    headerHeight > 0 &&
    contentInset == null &&
    contentInsetAdjustmentBehavior == null &&
    contentOffset == null;
  const contentTopPadding =
    contentMarginTop ?? (shouldUseManualHeaderSpacing ? headerHeight + 8 : undefined);
  const contentBottomPadding =
    bottomPadding != null ? bottomPadding + (contentMarginBottom ?? 0) : contentMarginBottom;
  const contentSpacingStyle = {
    ...(contentTopPadding != null ? { paddingTop: contentTopPadding } : null),
    ...(contentBottomPadding != null ? { paddingBottom: contentBottomPadding } : null),
  };

  return (
    <FlashList
      alwaysBounceVertical={alwaysBounceVertical ?? (!insideTrueSheet && os() === "ios")}
      contentInset={contentInset}
      contentContainerStyle={[
        insideTrueSheet ? styles.rootContent : styles.scrollRootContent,
        styles.scrollViewportFill,
        rootBackground,
        contentSpacingStyle,
        contentContainerStyle,
      ]}
      contentInsetAdjustmentBehavior={
        insideTrueSheet && os() === "ios"
          ? automaticContentInsetAdjustment
            ? "automatic"
            : "never"
          : shouldUseManualHeaderSpacing
            ? "never"
            : contentInsetAdjustmentBehavior
      }
      contentOffset={contentOffset}
      data={entries}
      extraData={entries}
      getItemType={getEntryType}
      initialScrollIndex={initialScrollIndex}
      ItemSeparatorComponent={FallbackListItemSeparator}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? "handled"}
      keyExtractor={getEntryKey}
      nestedScrollEnabled={nestedScrollEnabled ?? true}
      renderItem={renderFallbackListEntry}
      scrollEnabled={scrollable}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator ?? true}
      scrollIndicatorInsets={
        indicatorBottomInset != null
          ? {
              ...scrollIndicatorInsets,
              bottom: indicatorBottomInset,
            }
          : scrollIndicatorInsets
      }
      style={[styles.root, rootBackground, style]}
      {...scrollViewProps}
    />
  );
}

const styles = StyleSheet.create({
  customRowContent: {
    width: "100%",
  },
  disabledContent: {
    opacity: 0.5,
  },
  iconAfterRow: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 4,
    justifyContent: "flex-end",
    maxWidth: "50%",
    minWidth: 0,
  },
  pressable: {
    width: "100%",
  },
  root: {
    flex: 1,
    minHeight: 0,
  },
  rootContent: {
    overflow: "hidden",
    paddingVertical: 8,
    width: "100%",
  },
  rowContainer: {
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 30,
    paddingVertical: 12,
    width: "100%",
  },
  rowContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  rowFrame: {
    width: "100%",
  },
  scrollRootContent: {
    paddingVertical: 8,
    width: "100%",
  },
  scrollViewportFill: {
    flexGrow: 1,
  },
  sectionFooter: {
    paddingHorizontal: 30,
    paddingTop: 8,
  },
  sectionLabel: {
    paddingBottom: 8,
    paddingHorizontal: 30,
  },
  sectionSpacer: {
    height: 16,
  },
  selectValue: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 4,
    minWidth: 0,
  },
  staticRoot: {
    width: "100%",
  },
  staticSection: {
    width: "100%",
  },
  textColumn: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  trailingControl: {
    alignItems: "center",
    flexDirection: "row",
  },
});
