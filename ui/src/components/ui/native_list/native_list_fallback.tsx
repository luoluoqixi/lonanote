import { ChevronRight, ChevronsUpDown } from "@tamagui/lucide-icons-2";
import { Children, Fragment, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ListGroup } from "../list_group";
import { Select } from "../select";
import { Separator } from "../separator";
import { Switch } from "../switch";
import { Text } from "../text";
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

// ─── RowShell ────────────────────────────────────

type RowShellProps = {
  children: ReactNode;
  disabled?: boolean;
  nativeHaptics?: NativeListItemBaseProps["nativeHaptics"];
  onPress?: () => void;
};

function RowShell({ children, disabled, nativeHaptics, onPress }: RowShellProps) {
  const resolvedHaptics = useResolvedNativeHaptics(nativeHaptics);

  if (!onPress) {
    return <View style={styles.rowShell}>{children}</View>;
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
        pressed && !disabled ? styles.pressablePressed : null,
        disabled ? styles.pressableDisabled : null,
      ]}
    >
      <View style={styles.rowShell}>{children}</View>
    </Pressable>
  );
}

// ─── StandardRow ─────────────────────────────────

type StandardRowProps = NativeListItemBaseProps & {
  trailingControl?: ReactNode;
};

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

function StandardRow({
  chevron,
  disabled,
  nativeHaptics,
  onPress,
  subtitle,
  title,
  trailingControl,
  value,
}: StandardRowProps) {
  return (
    <RowShell disabled={disabled} nativeHaptics={nativeHaptics} onPress={onPress}>
      <View style={styles.rowContent}>
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
        {trailingControl}
        {chevron ? <ChevronRight color="$color10" size={18} /> : null}
      </View>
    </RowShell>
  );
}

// ─── Item Components ─────────────────────────────

export function NativeListActionItem(props: NativeListActionItemProps) {
  return <StandardRow {...props} chevron={props.chevron} />;
}

export function NativeListNavigationItem(props: NativeListNavigationItemProps) {
  return <StandardRow {...props} chevron={props.chevron ?? true} />;
}

export function NativeListSwitchItem({ switchProps, ...itemProps }: NativeListSwitchItemProps) {
  const checked = switchProps.checked ?? switchProps.defaultChecked ?? false;

  return (
    <StandardRow
      {...itemProps}
      disabled={itemProps.disabled || switchProps.disabled}
      nativeHaptics={itemProps.nativeHaptics ?? true}
      onPress={() => switchProps.onCheckedChange?.(!checked)}
      trailingControl={
        <Switch
          {...switchProps}
          native
          onPress={(event) => {
            switchProps.onPress?.(event);
            event.stopPropagation();
          }}
        />
      }
      value={undefined}
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
        <View style={[styles.rowShell, disabled ? styles.pressableDisabled : null]}>
          <View style={styles.rowContent}>
            <View style={styles.textColumn}>
              {itemProps.title != null ? (
                <Text fontSize="$5" fontWeight="500" numberOfLines={itemProps.subtitle ? 2 : 1}>
                  {itemProps.title}
                </Text>
              ) : null}
              {itemProps.subtitle != null ? (
                <Text color="$color10" fontSize="$3" numberOfLines={2}>
                  {itemProps.subtitle}
                </Text>
              ) : null}
            </View>
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
    <RowShell disabled={disabled} nativeHaptics={nativeHaptics} onPress={onPress}>
      {children}
    </RowShell>
  );
}

// ─── Section ─────────────────────────────────────

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
      <ListGroup background="$background" rounded="$4" self="stretch">
        {childrenArray.map((child, index) => (
          <Fragment key={index}>
            {index > 0 ? <Separator /> : null}
            <ListGroup.GroupItem>{child}</ListGroup.GroupItem>
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

// ─── NativeList Root ─────────────────────────────

export function NativeListRoot({
  children,
  contentContainerStyle,
  native: _native,
  style,
  ...rest
}: NativeListRootProps) {
  void _native;

  return (
    <ScrollView
      contentContainerStyle={[styles.rootContent, contentContainerStyle]}
      style={[styles.root, style]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────

const styles = StyleSheet.create({
  pressable: { width: "100%" },
  pressableDisabled: { opacity: 0.5 },
  pressablePressed: { backgroundColor: "rgba(128, 128, 128, 0.08)" },
  root: { flex: 1 },
  rootContent: {
    gap: 16,
    paddingVertical: 8,
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
  section: { gap: 8 },
  sectionFooter: { paddingHorizontal: 16 },
  sectionLabel: { paddingHorizontal: 16 },
  selectValue: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 4,
    maxWidth: "45%",
  },
  textColumn: { flex: 1, gap: 4, minWidth: 0 },
});
