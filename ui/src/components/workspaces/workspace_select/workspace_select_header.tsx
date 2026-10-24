import { Stack, router } from "expo-router";
import {
  ArrowDownUp,
  CalendarDays,
  CircleCheck,
  Ellipsis,
  FolderPlus,
  Search,
  Settings,
} from "lucide-react-native";
import { type ComponentProps, useMemo } from "react";
import { View } from "react-native";
import { Button, Dropdown, type DropdownItemData, Text, useUiTheme } from "rn-ui-kit";

import { getSelectionHeaderRightMenuProps } from "@/components/common/header_actions";

import { getWorkspaceSelectSettingsMenuItems } from "./workspace_select_menu";

type WorkspaceSelectHeaderProps = {
  embedded?: boolean;
  sortMenuItems?: DropdownItemData[];
  groupMenuItems?: DropdownItemData[];
  areAllWorkspacesSelected: boolean;
  canSelectWorkspaces: boolean;
  isGroupModeDisabled: boolean;
  isScanningWorkspaces: boolean;
  isWorkspaceSelectionMode: boolean;
  onCreateWorkspace: () => void;
  onFinishWorkspaceSelection: () => void;
  onOpenWorkspaceGroupMode: () => void;
  onOpenWorkspaceSort: () => void;
  onScanWorkspaces: () => void;
  onToggleSelectAllWorkspaces: () => void;
  onToggleWorkspaceSelectionMode: () => void;
};

export function WorkspaceSelectHeader({
  embedded = false,
  sortMenuItems,
  groupMenuItems,
  areAllWorkspacesSelected,
  canSelectWorkspaces,
  isGroupModeDisabled,
  isScanningWorkspaces,
  isWorkspaceSelectionMode,
  onCreateWorkspace,
  onFinishWorkspaceSelection,
  onOpenWorkspaceGroupMode,
  onOpenWorkspaceSort,
  onScanWorkspaces,
  onToggleSelectAllWorkspaces,
  onToggleWorkspaceSelectionMode,
}: WorkspaceSelectHeaderProps) {
  const theme = useUiTheme();
  const accentColor = theme.primary as ComponentProps<typeof CircleCheck>["color"];
  const menuItems = useMemo<DropdownItemData[]>(
    () => [
      {
        disabled: !canSelectWorkspaces,
        icon: <CircleCheck color={accentColor} size={14} />,
        iconProps: {
          androidIconName: "ic_workspace_select",
          ios: { name: "checkmark.circle" },
        },
        label: "选择工作区",
        onPress: onToggleWorkspaceSelectionMode,
        value: "select-workspace",
      },
      {
        icon: <FolderPlus color={accentColor} size={14} />,
        iconProps: {
          androidIconName: "ic_workspace_create",
          ios: { name: "folder.badge.plus" },
        },
        label: "创建工作区",
        disabled: isScanningWorkspaces,
        onPress: onCreateWorkspace,
        value: "create-workspace",
      },
      {
        disabled: isScanningWorkspaces,
        icon: <Search color={accentColor} size={14} />,
        iconProps: {
          ios: { name: "magnifyingglass" },
        },
        label: isScanningWorkspaces ? "正在扫描工作区…" : "扫描工作区",
        onPress: onScanWorkspaces,
        value: "scan-workspaces",
      },
      {
        separator: true,
        value: "separator-01",
      },
      {
        icon: <ArrowDownUp color={accentColor} size={14} />,
        iconProps: {
          androidIconName: "ic_workspace_sort",
          ios: { name: "arrow.up.arrow.down" },
        },
        label: "排序方式",
        onPress: sortMenuItems ? undefined : onOpenWorkspaceSort,
        subMenu: sortMenuItems,
        value: "sort-workspaces",
      },
      {
        disabled: isGroupModeDisabled,
        icon: <CalendarDays color={accentColor} size={14} />,
        iconProps: {
          androidIconName: "ic_workspace_group",
          ios: { name: "calendar" },
        },
        label: "分组方式",
        onPress: groupMenuItems ? undefined : onOpenWorkspaceGroupMode,
        subMenu: groupMenuItems,
        value: "group-workspaces",
      },
      ...getWorkspaceSelectSettingsMenuItems({
        embedded,
        settingsItem: {
          icon: <Settings color={accentColor} size={14} />,
          iconProps: {
            androidIconName: "ic_workspace_settings",
            ios: { name: "gearshape" },
          },
          label: "设置",
          onPress: () => {
            router.push("/settings");
          },
          value: "settings",
        },
      }),
    ],
    [
      accentColor,
      embedded,
      sortMenuItems,
      groupMenuItems,
      canSelectWorkspaces,
      isGroupModeDisabled,
      isScanningWorkspaces,
      onCreateWorkspace,
      onOpenWorkspaceGroupMode,
      onOpenWorkspaceSort,
      onScanWorkspaces,
      onToggleWorkspaceSelectionMode,
    ],
  );

  if (embedded) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 8,
          gap: 8,
          backgroundColor: theme.background,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", flex: 1 }}>工作区</Text>
        {isWorkspaceSelectionMode ? (
          <>
            <Button size="sm" variant="ghost" onPress={onToggleSelectAllWorkspaces}>
              {areAllWorkspacesSelected ? "取消全选" : "全选"}
            </Button>
            <Button size="sm" variant="ghost" onPress={onFinishWorkspaceSelection}>
              完成
            </Button>
          </>
        ) : (
          <Dropdown
            contentSize="sm"
            contentProps={{ align: "end" }}
            items={menuItems}
            trigger={
              <Button
                size="xs"
                variant="ghost"
                accessibilityLabel="工作区操作"
                style={{ width: 30, height: 30 }}
              >
                <Ellipsis size={18} color={theme.foreground} />
              </Button>
            }
          />
        )}
      </View>
    );
  }

  return (
    <Stack.Screen
      options={{
        ...getSelectionHeaderRightMenuProps({
          labelColor: theme.primary,
          menuItems,
          isSelectionMode: isWorkspaceSelectionMode,
          areAllEntriesSelected: areAllWorkspacesSelected,
          onFinishSelection: onFinishWorkspaceSelection,
          onToggleSelectAllEntries: onToggleSelectAllWorkspaces,
        }),
      }}
    />
  );
}
