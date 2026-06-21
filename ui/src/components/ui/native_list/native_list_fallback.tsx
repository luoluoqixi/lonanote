import { HeaderHeightContext } from "@react-navigation/elements";
import { ChevronRight, ChevronsUpDown } from "@tamagui/lucide-icons-2";
import { Children, Fragment, type ReactNode, useContext } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { os } from "@/api/common/platform";

import { ListGroup } from "../list_group";
import { ListItem } from "../list_item";
import { Select } from "../select";
import { Separator } from "../separator";
import { Switch } from "../switch";
import { Text } from "../text";
import {
  getTrueSheetScrollBottomPadding,
  getTrueSheetScrollIndicatorBottomInset,
} from "../true_sheet/sheet_scroll_layout";
import { useTrueSheetScrollLayout } from "../true_sheet/true_sheet_scroll_context";
import { triggerNativeHaptics, useResolvedNativeHaptics } from "../utils";
import type {
  NativeListActionItemProps,
  NativeListItemBaseProps,
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

function FallbackRowContainer({ children, disabled, nativeHaptics, onPress }: RowContainerProps) {
  const resolvedHaptics = useResolvedNativeHaptics(nativeHaptics);

  if (onPress == null) {
    return (
      <View style={[styles.rowContainer, disabled ? styles.disabledContent : null]}>
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
      style={({ pressed }) => [
        styles.pressable,
        disabled ? styles.disabledContent : null,
        pressed && !disabled ? styles.pressablePressed : null,
      ]}
    >
      <View style={styles.rowContainer}>{children}</View>
    </Pressable>
  );
}

function FallbackSectionItem({ children }: { children: ReactNode }) {
  return <ListGroup.GroupItem>{children}</ListGroup.GroupItem>;
}

function FallbackRowLabel({ subtitle, title }: { subtitle?: ReactNode; title?: ReactNode }) {
  return (
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
  );
}

type PressRowProps = NativeListItemBaseProps & {
  trailingControl?: ReactNode;
};

function FallbackPressRow({
  chevron = false,
  disabled,
  nativeHaptics,
  onPress,
  subtitle,
  title,
  trailingControl,
  value,
}: PressRowProps) {
  if (value == null && trailingControl == null) {
    return (
      <FallbackSectionItem>
        <ListItem
          disabled={disabled}
          iconAfter={chevron ? ChevronRight : undefined}
          nativeHaptics={nativeHaptics}
          onPress={onPress}
          subTitle={subtitle}
          title={title}
        />
      </FallbackSectionItem>
    );
  }

  return (
    <FallbackSectionItem>
      <FallbackRowContainer disabled={disabled} nativeHaptics={nativeHaptics} onPress={onPress}>
        <View style={styles.rowContent}>
          <FallbackRowLabel subtitle={subtitle} title={title} />
          {value != null ? (
            <Text color="$color10" fontSize="$4" numberOfLines={1}>
              {value}
            </Text>
          ) : null}
          {trailingControl}
          {chevron ? <ChevronRight color="$color10" size={18} /> : null}
        </View>
      </FallbackRowContainer>
    </FallbackSectionItem>
  );
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
    <FallbackPressRow
      {...itemProps}
      disabled={disabled}
      nativeHaptics={itemProps.nativeHaptics ?? true}
      onPress={() => switchProps.onCheckedChange?.(!checked)}
      trailingControl={
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
      value={undefined}
    />
  );
}

export function NativeListSelectItem({ selectProps, ...itemProps }: NativeListSelectItemProps) {
  const disabled = itemProps.disabled || selectProps.disabled || selectProps.isDisabled;
  const selectedLabel = getSelectedLabel(selectProps);

  return (
    <FallbackSectionItem>
      <Select
        {...selectProps}
        disabled={disabled}
        native
        nativeHaptics={selectProps.nativeHaptics ?? itemProps.nativeHaptics ?? false}
        nativeTrigger
        nativeTriggerContent={
          <View style={[styles.rowContainer, disabled ? styles.disabledContent : null]}>
            <View style={styles.rowContent}>
              <FallbackRowLabel subtitle={itemProps.subtitle} title={itemProps.title} />
              <View style={styles.selectValue}>
                <Text color="$color10" fontSize="$4" numberOfLines={1}>
                  {selectedLabel}
                </Text>
                <ChevronsUpDown color="$color10" size={14} />
              </View>
            </View>
          </View>
        }
      />
    </FallbackSectionItem>
  );
}

export function NativeListItem({
  children,
  disabled,
  nativeHaptics,
  onPress,
}: {
  children?: ReactNode;
  disabled?: boolean;
  nativeHaptics?: NativeListItemBaseProps["nativeHaptics"];
  onPress?: () => void;
}) {
  return (
    <FallbackSectionItem>
      <FallbackRowContainer disabled={disabled} nativeHaptics={nativeHaptics} onPress={onPress}>
        <View style={styles.customRowContent}>{children}</View>
      </FallbackRowContainer>
    </FallbackSectionItem>
  );
}

export function NativeListSection({ children, footer, title }: NativeListSectionProps) {
  const childrenArray = Children.toArray(children);

  return (
    <View style={styles.section}>
      {title != null ? (
        <View style={styles.sectionLabel}>
          <Text color="$color10" fontSize="$3">
            {title}
          </Text>
        </View>
      ) : null}
      <ListGroup background="$background" rounded="$4" width="100%" self="stretch">
        {childrenArray.map((child, index) => (
          <Fragment key={index}>
            {index > 0 ? <Separator /> : null}
            {child}
          </Fragment>
        ))}
      </ListGroup>
      {footer != null ? (
        <View style={styles.sectionFooter}>
          <Text color="$color10" fontSize="$3">
            {footer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function NativeListRoot({
  children,
  contentContainerStyle,
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
    nestedScrollEnabled,
    scrollIndicatorInsets,
    showsVerticalScrollIndicator,
    ...scrollViewProps
  } = rest;
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const insets = useSafeAreaInsets();
  const {
    active: insideTrueSheet,
    automaticContentInsetAdjustment,
    insetAdjustment,
    nativeScrollInsetsApplied,
  } = useTrueSheetScrollLayout();

  if (!scrollable) {
    return (
      <View style={[styles.staticRoot, styles.rootContent, contentContainerStyle, style]}>
        {children}
      </View>
    );
  }

  const bottomPadding =
    insideTrueSheet && os() === "ios"
      ? getTrueSheetScrollBottomPadding({
          insetAdjustment,
          nativeScrollInsetsApplied,
          safeAreaBottom: insets.bottom,
        })
      : undefined;
  const indicatorBottomInset =
    insideTrueSheet && os() === "ios"
      ? getTrueSheetScrollIndicatorBottomInset({
          automaticContentInsetAdjustment,
          nativeScrollInsetsApplied,
          safeAreaBottom: insets.bottom,
        })
      : undefined;
  const shouldUseManualHeaderSpacing =
    os() === "ios" &&
    !insideTrueSheet &&
    headerHeight > 0 &&
    contentInset == null &&
    contentInsetAdjustmentBehavior == null &&
    contentOffset == null;

  return (
    <ScrollView
      alwaysBounceVertical={alwaysBounceVertical ?? os() === "ios"}
      contentInset={contentInset}
      contentContainerStyle={[
        styles.scrollRootContent,
        !insideTrueSheet ? styles.scrollViewportFill : styles.scrollViewportWrap,
        shouldUseManualHeaderSpacing ? { paddingTop: headerHeight + 8 } : null,
        bottomPadding != null ? { paddingBottom: bottomPadding } : null,
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
      keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? "handled"}
      nestedScrollEnabled={nestedScrollEnabled ?? true}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator ?? true}
      scrollIndicatorInsets={
        indicatorBottomInset != null
          ? {
              ...scrollIndicatorInsets,
              bottom: indicatorBottomInset,
            }
          : scrollIndicatorInsets
      }
      style={[styles.root, style]}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  customRowContent: {
    width: "100%",
  },
  disabledContent: {
    opacity: 0.5,
  },
  pressable: {
    width: "100%",
  },
  pressablePressed: {
    backgroundColor: "rgba(128, 128, 128, 0.08)",
  },
  root: {
    flex: 1,
    minHeight: 0,
  },
  rootContent: {
    gap: 16,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: "100%",
  },
  scrollRootContent: {
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: "100%",
  },
  scrollViewportFill: {
    flexGrow: 1,
  },
  scrollViewportWrap: {
    flexGrow: 0,
  },
  rowContainer: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
  },
  rowContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  section: {
    gap: 8,
    overflow: "hidden",
    width: "100%",
  },
  sectionFooter: {
    paddingHorizontal: 16,
  },
  sectionLabel: {
    paddingHorizontal: 16,
  },
  selectValue: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 4,
    maxWidth: "45%",
  },
  staticRoot: {
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
