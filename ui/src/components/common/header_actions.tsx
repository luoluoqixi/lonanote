import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";
import { Button, Dropdown, DropdownItemData } from "rn-ui-kit";

import { isIos, isIos16Plus } from "@/api/common";

export interface SelectionHeaderRightProps {
  isSelectionMode: boolean;
  areAllEntriesSelected: boolean;
  onToggleSelectAllEntries: () => void;
  onFinishSelection: () => void;
  menuItems: DropdownItemData[];
  labelColor: string;
}

export interface MenuHeaderRightProps {
  menuItems: DropdownItemData[];
  labelColor: string;
  isVisible?: boolean;
}

export function HeaderActionButton({
  accessibilityLabel,
  circular = true,
  label,
  onPress,
  opacity,
}: {
  accessibilityLabel: string;
  circular?: boolean;
  label: string;
  onPress?: () => void;
  opacity?: number;
}) {
  const ios = isIos();
  const ios16 = ios && isIos16Plus();
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      circular={circular}
      hitSlop={8}
      native={ios16}
      nativeButtonStyle="glass"
      onPress={onPress}
      style={{ opacity }}
      title={label}
      variant="link"
      textClassName={!ios ? "no-underline" : undefined}
      className={!ios ? "px-2" : undefined}
    />
  );
}

export function SelectionHeaderRightMenu({
  isSelectionMode,
  areAllEntriesSelected,
  onToggleSelectAllEntries,
  onFinishSelection,
  menuItems,
  labelColor,
}: SelectionHeaderRightProps) {
  if (isSelectionMode) {
    return (
      <View style={styles.headerActions}>
        <HeaderActionButton
          accessibilityLabel={areAllEntriesSelected ? "取消全选" : "全选"}
          circular={false}
          label={areAllEntriesSelected ? "取消全选" : "全选"}
          onPress={onToggleSelectAllEntries}
        />
        <HeaderActionButton
          accessibilityLabel="完成选择"
          circular={false}
          label="完成"
          onPress={onFinishSelection}
        />
      </View>
    );
  }

  return (
    <Dropdown
      triggerLabel="•••"
      nativeTrigger
      nativeTriggerIcon="none"
      nativeTriggerLabelProps={{
        style: {
          color: labelColor,
          opacity: 1,
        },
      }}
      nativeTriggerContainerStyle={{
        paddingHorizontal: 5,
        gap: 0,
      }}
      items={menuItems}
      nativeHaptics
      itemNativeHaptics
    />
  );
}

export function MenuHeaderRight({ menuItems, labelColor }: MenuHeaderRightProps) {
  return (
    <Dropdown
      triggerLabel="•••"
      nativeTrigger
      nativeTriggerIcon="none"
      nativeTriggerLabelProps={{
        style: {
          color: labelColor,
          opacity: 1,
        },
      }}
      nativeTriggerContainerStyle={{
        paddingHorizontal: 5,
        gap: 0,
      }}
      items={menuItems}
      nativeHaptics
      itemNativeHaptics
    />
  );
}

export function getMenuHeaderRightMenuProps({
  isVisible = true,
  menuItems,
  labelColor,
}: MenuHeaderRightProps): NativeStackNavigationOptions {
  return {
    headerRight: () =>
      isVisible ? <MenuHeaderRight menuItems={menuItems} labelColor={labelColor} /> : null,
  };
}

export function getSelectionHeaderRightMenuProps({
  isSelectionMode,
  areAllEntriesSelected,
  onToggleSelectAllEntries,
  onFinishSelection,
  menuItems,
  labelColor,
}: SelectionHeaderRightProps): NativeStackNavigationOptions {
  const result: NativeStackNavigationOptions = {
    headerRight: () => {
      // iOS 15 对 headerRight 中的自定义子视图布局和触摸转发不稳定。
      // 选择操作改用 Native Stack 的系统导航栏按钮，避免按钮被导航栏容器裁剪或吞掉触摸。
      if (isSelectionMode && isIos()) {
        return null;
      }
      return (
        <SelectionHeaderRightMenu
          isSelectionMode={isSelectionMode}
          areAllEntriesSelected={areAllEntriesSelected}
          menuItems={menuItems}
          onFinishSelection={onFinishSelection}
          onToggleSelectAllEntries={onToggleSelectAllEntries}
          labelColor={labelColor}
        />
      );
    },
  };
  if (isIos()) {
    result.unstable_headerRightItems = (() =>
      isSelectionMode
        ? [
            {
              accessibilityLabel: areAllEntriesSelected ? "取消全选" : "全选",
              label: areAllEntriesSelected ? "取消全选" : "全选",
              onPress: onToggleSelectAllEntries,
              type: "button" as const,
              labelStyle: {
                color: labelColor,
              },
              tintColor: labelColor,
            },
            {
              accessibilityLabel: "完成选择",
              label: "完成",
              onPress: onFinishSelection,
              type: "button" as const,
              labelStyle: {
                color: labelColor,
              },
              tintColor: labelColor,
            },
          ]
        : undefined) as unknown as NonNullable<
      NativeStackNavigationOptions["unstable_headerRightItems"]
    >;
  }
  return result;
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    gap: isIos() ? 10 : 0,
  },
});
