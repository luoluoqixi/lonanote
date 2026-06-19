import { ChevronRight } from "@tamagui/lucide-icons-2";
import { Fragment, type ReactNode } from "react";
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
  return (
    <StandardRow
      {...itemProps}
      trailingControl={<Switch {...switchProps} native={true} />}
      value={undefined}
    />
  );
}

export function NativeListSelectItem({ selectProps, ...itemProps }: NativeListSelectItemProps) {
  return (
    <StandardRow
      {...itemProps}
      trailingControl={<Select {...selectProps} native={true} nativeTrigger={true} />}
      value={undefined}
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

export function NativeListSection({ children, title }: NativeListSectionProps) {
  const childrenArray = children ? (Array.isArray(children) ? children : [children]) : [];

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
        {childrenArray.map((child, index) => (
          <Fragment key={index}>
            {index > 0 ? <Separator /> : null}
            <ListGroup.GroupItem>{child}</ListGroup.GroupItem>
          </Fragment>
        ))}
      </ListGroup>
    </View>
  );
}

// ─── NativeList Root ─────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function NativeListRoot({ children, native: _native, ...rest }: NativeListRootProps) {
  return (
    <ScrollView style={styles.root} {...rest}>
      {children}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────

const styles = StyleSheet.create({
  pressable: { flex: 1 },
  pressableDisabled: { opacity: 0.5 },
  pressablePressed: { backgroundColor: "rgba(128, 128, 128, 0.08)" },
  root: { flex: 1 },
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
  sectionLabel: { paddingHorizontal: 16 },
  textColumn: { flex: 1, gap: 4, minWidth: 0 },
});
