import { type Href, Stack, useRouter } from "expo-router";
import {
  ArrowDownUp,
  ArrowLeftRight,
  CalendarDays,
  CircleCheck,
  FilePlus2,
  FolderPlus,
  Settings,
} from "lucide-react-native";
import { type ComponentProps, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Dropdown, type DropdownItemData, useUiTheme } from "rn-ui-kit";

import { isIos } from "@/api/common";

type WorkspaceExplorerHeaderProps = {
  areAllEntriesSelected: boolean;
  canSelectEntries: boolean;
  isGroupModeDisabled: boolean;
  isSelectionMode: boolean;
  isSwitchingWorkspace: boolean;
  onCreateDirectory: () => void;
  onCreateNote: () => void;
  onFinishSelection: () => void;
  onOpenGroupMode: () => void;
  onOpenSort: () => void;
  onSwitchWorkspace: () => void;
  onToggleSelectAllEntries: () => void;
  onToggleSelectionMode: () => void;
  title: string;
};

function HeaderActionButton({
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
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      circular={circular}
      hitSlop={8}
      native={isIos()}
      nativeButtonStyle="glass"
      onPress={onPress}
      style={{ opacity }}
      title={label}
      variant="ghost"
    />
  );
}

export function WorkspaceExplorerHeader({
  areAllEntriesSelected,
  canSelectEntries,
  isGroupModeDisabled,
  isSelectionMode,
  isSwitchingWorkspace,
  onCreateDirectory,
  onCreateNote,
  onFinishSelection,
  onOpenGroupMode,
  onOpenSort,
  onSwitchWorkspace,
  onToggleSelectAllEntries,
  onToggleSelectionMode,
  title,
}: WorkspaceExplorerHeaderProps) {
  const router = useRouter();
  const theme = useUiTheme();
  const accentColor = theme.primary as ComponentProps<typeof CircleCheck>["color"];
  const menuItems = useMemo<DropdownItemData[]>(
    () => [
      {
        disabled: !canSelectEntries,
        icon: <CircleCheck color={accentColor} size={14} />,
        iconProps: {
          androidIconName: "ic_workspace_select",
          ios: { name: "checkmark.circle" },
        },
        label: "选择",
        onPress: onToggleSelectionMode,
        value: "select",
      },
      {
        icon: <FilePlus2 color={accentColor} size={14} />,
        iconProps: {
          androidIconName: "ic_workspace_create_note",
          ios: { name: "doc.badge.plus" },
        },
        label: "创建笔记",
        onPress: onCreateNote,
        value: "create-note",
      },
      {
        icon: <FolderPlus color={accentColor} size={14} />,
        iconProps: {
          androidIconName: "ic_workspace_create",
          ios: { name: "folder.badge.plus" },
        },
        label: "创建文件夹",
        onPress: onCreateDirectory,
        value: "create-directory",
      },
      { separator: true, value: "separator-01" },
      {
        icon: <ArrowDownUp color={accentColor} size={14} />,
        iconProps: {
          androidIconName: "ic_workspace_sort",
          ios: { name: "arrow.up.arrow.down" },
        },
        label: "排序方式",
        onPress: onOpenSort,
        value: "sort",
      },
      {
        disabled: isGroupModeDisabled,
        icon: <CalendarDays color={accentColor} size={14} />,
        iconProps: {
          androidIconName: "ic_workspace_group",
          ios: { name: "calendar" },
        },
        label: "分组方式",
        onPress: onOpenGroupMode,
        value: "group",
      },
      { separator: true, value: "separator-02" },
      {
        disabled: isSwitchingWorkspace,
        icon: <ArrowLeftRight color={accentColor} size={14} />,
        iconProps: {
          androidIconName: "ic_workspace_switch",
          ios: { name: "arrow.left.arrow.right" },
        },
        label: "切换工作区",
        onPress: onSwitchWorkspace,
        value: "switch-workspace",
      },
      {
        icon: <Settings color={accentColor} size={14} />,
        iconProps: {
          androidIconName: "ic_workspace_settings",
          ios: { name: "gearshape" },
        },
        label: "设置",
        onPress: () => router.push("/settings" as Href),
        value: "settings",
      },
    ],
    [
      accentColor,
      canSelectEntries,
      isGroupModeDisabled,
      isSwitchingWorkspace,
      onCreateDirectory,
      onCreateNote,
      onOpenGroupMode,
      onOpenSort,
      onSwitchWorkspace,
      onToggleSelectionMode,
      router,
    ],
  );

  return (
    <Stack.Screen
      options={{
        headerLargeTitle: true,
        headerLargeTitleEnabled: true,
        headerLargeTitleShadowVisible: false,
        headerRight: () => {
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
              triggerProps={{
                circular: true,
                native: true,
              }}
              items={menuItems}
              nativeHaptics
              itemNativeHaptics
            />
          );
        },
        title,
      }}
    />
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    gap: isIos() ? 10 : 0,
  },
});
