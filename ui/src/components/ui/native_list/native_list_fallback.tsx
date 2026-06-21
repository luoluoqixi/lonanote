import { HeaderHeightContext } from "@react-navigation/elements";
import { ChevronRight, ChevronsUpDown } from "@tamagui/lucide-icons-2";
import { Children, Fragment, type ReactNode, useContext } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "tamagui";

import { os } from "@/api/common/platform";

import { ListGroup } from "../list_group";
import { ListItem } from "../list_item";
import { Select } from "../select";
import { Separator } from "../separator";
import { Switch } from "../switch";
import { SizableText, Text } from "../text";
import {
  getTrueSheetScrollBottomPadding,
  getTrueSheetScrollIndicatorBottomInset,
} from "../true_sheet/sheet_scroll_layout";
import { useTrueSheetScrollLayout } from "../true_sheet/true_sheet_scroll_context";
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

function FallbackRowContainer({ children, disabled, nativeHaptics, onPress }: RowContainerProps) {
  const resolvedHaptics = useResolvedNativeHaptics(nativeHaptics);
  const theme = useTheme();
  const rowBackground = { backgroundColor: theme.background?.val };

  if (onPress == null) {
    return (
      <View style={[styles.rowContainer, rowBackground, disabled ? styles.disabledContent : null]}>
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
      <View style={[styles.rowContainer, rowBackground]}>{children}</View>
    </Pressable>
  );
}

function FallbackSectionItem({ children }: { children: ReactNode }) {
  return <ListGroup.GroupItem>{children}</ListGroup.GroupItem>;
}

type NativeListRowProps = NativeListItemBaseProps & {
  iconAfter?: ReactNode;
  titleColor?: string | false;
};

/**
 * 统一行组件：有 subtitle 时用 ListItem 的 title/subTitle props；
 * 只有 title 时用 children 居中。
 */
function NativeListRow({
  chevron = false,
  disabled,
  iconAfter,
  nativeHaptics,
  onPress,
  subtitle,
  title,
  titleAlign,
  titleColor,
  value,
}: NativeListRowProps) {
  const hasSubtitle = subtitle != null;

  const combinedIconAfter = (
    <View style={styles.iconAfterRow}>
      {value != null ? (
        <Text color="$color10" fontSize="$5" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {iconAfter}
      {chevron ? <ChevronRight color="$color10" size={18} /> : null}
    </View>
  );

  if (hasSubtitle) {
    return (
      <ListItem
        disabled={disabled}
        nativeHaptics={nativeHaptics}
        onPress={onPress}
        subTitle={subtitle}
        title={
          titleAlign != null && typeof title === "string" ? (
            <View
              style={{
                width: "100%",
                alignItems:
                  titleAlign == "center"
                    ? "center"
                    : titleAlign === "right"
                      ? "flex-end"
                      : "flex-start",
              }}
            >
              <SizableText size="$true" style={titleColor ? { color: titleColor } : undefined}>
                {title}
              </SizableText>
            </View>
          ) : (
            title
          )
        }
        iconAfter={combinedIconAfter}
      />
    );
  }

  return (
    <ListItem
      disabled={disabled}
      nativeHaptics={nativeHaptics}
      onPress={onPress}
      iconAfter={combinedIconAfter}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems:
            titleAlign == "center" ? "center" : titleAlign === "right" ? "flex-end" : "flex-start",
          minWidth: 0,
        }}
      >
        <SizableText
          size="$true"
          numberOfLines={1}
          style={titleColor ? { color: titleColor } : undefined}
        >
          {title}
        </SizableText>
      </View>
    </ListItem>
  );
}

type PressRowProps = NativeListItemBaseProps & {
  trailingControl?: ReactNode;
};

function FallbackPressRow({ trailingControl, ...props }: PressRowProps) {
  return (
    <FallbackSectionItem>
      <NativeListRow {...props} iconAfter={trailingControl} />
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
    <FallbackSectionItem>
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
    </FallbackSectionItem>
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
  titleAlign = "center",
  btnTint,
  ...itemProps
}: NativeListItemProps) {
  return (
    <FallbackSectionItem>
      <NativeListRow
        {...itemProps}
        btnTint={btnTint}
        titleAlign={titleAlign}
        titleColor={typeof btnTint !== "boolean" ? btnTint : undefined}
        title={title}
        disabled={disabled}
        onPress={onPress}
      />
    </FallbackSectionItem>
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
          <NativeListRow
            {...itemProps}
            disabled={disabled}
            iconAfter={
              <View style={styles.selectValue}>
                <Text color="$color10" fontSize="$4" numberOfLines={1}>
                  {selectedLabel}
                </Text>
                <ChevronsUpDown color="$color10" size={14} />
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
    </FallbackSectionItem>
  );
}

export function NativeListCustomItem({
  children,
  disabled,
  nativeHaptics,
  onPress,
}: NativeListCustomItemProps) {
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

  if (insideTrueSheet) {
    const bottomPadding =
      os() === "ios"
        ? getTrueSheetScrollBottomPadding({
            insetAdjustment,
            nativeScrollInsetsApplied,
            safeAreaBottom: insets.bottom,
          })
        : undefined;
    const indicatorBottomInset =
      os() === "ios"
        ? getTrueSheetScrollIndicatorBottomInset({
            automaticContentInsetAdjustment,
            nativeScrollInsetsApplied,
            safeAreaBottom: insets.bottom,
          })
        : undefined;

    return (
      <ScrollView
        alwaysBounceVertical={alwaysBounceVertical}
        contentInset={contentInset}
        contentContainerStyle={[
          styles.rootContent,
          bottomPadding != null ? { paddingBottom: bottomPadding } : null,
          contentContainerStyle,
        ]}
        contentInsetAdjustmentBehavior={
          os() === "ios"
            ? automaticContentInsetAdjustment
              ? "automatic"
              : "never"
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

  const shouldUseManualHeaderSpacing =
    os() === "ios" &&
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
        styles.scrollViewportFill,
        shouldUseManualHeaderSpacing ? { paddingTop: headerHeight + 8 } : null,
        contentContainerStyle,
      ]}
      contentInsetAdjustmentBehavior={
        shouldUseManualHeaderSpacing ? "never" : contentInsetAdjustmentBehavior
      }
      contentOffset={contentOffset}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? "handled"}
      nestedScrollEnabled={nestedScrollEnabled ?? true}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator ?? true}
      scrollIndicatorInsets={scrollIndicatorInsets}
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
  },
  staticRoot: {
    width: "100%",
  },
  textColumn: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  iconAfterRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  trailingControl: {
    alignItems: "center",
    flexDirection: "row",
  },
});
