import { Stack, router } from "expo-router";
import { ArrowDownUp, CalendarDays, CircleCheck, FolderPlus, Settings } from "lucide-react-native";
import { type ComponentProps, useMemo } from "react";
import { type DropdownItemData, useUiTheme } from "rn-ui-kit";

import { getSelectionHeaderRightMenuProps } from "@/components/common/header_actions";

type WorkspaceSelectHeaderProps = {
  areAllWorkspacesSelected: boolean;
  canSelectWorkspaces: boolean;
  isGroupModeDisabled: boolean;
  isWorkspaceSelectionMode: boolean;
  onCreateWorkspace: () => void;
  onFinishWorkspaceSelection: () => void;
  onOpenWorkspaceGroupMode: () => void;
  onOpenWorkspaceSort: () => void;
  onToggleSelectAllWorkspaces: () => void;
  onToggleWorkspaceSelectionMode: () => void;
};

export function WorkspaceSelectHeader({
  areAllWorkspacesSelected,
  canSelectWorkspaces,
  isGroupModeDisabled,
  isWorkspaceSelectionMode,
  onCreateWorkspace,
  onFinishWorkspaceSelection,
  onOpenWorkspaceGroupMode,
  onOpenWorkspaceSort,
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
        onPress: onCreateWorkspace,
        value: "create-workspace",
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
        onPress: onOpenWorkspaceSort,
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
        onPress: onOpenWorkspaceGroupMode,
        value: "group-workspaces",
      },
      {
        separator: true,
        value: "separator-02",
      },
      {
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
    ],
    [
      accentColor,
      canSelectWorkspaces,
      isGroupModeDisabled,
      onCreateWorkspace,
      onOpenWorkspaceGroupMode,
      onOpenWorkspaceSort,
      onToggleWorkspaceSelectionMode,
    ],
  );

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
