import { Stack, router } from "expo-router";
import { ArrowDownUp, CalendarDays, CircleCheck, FolderPlus, Settings } from "lucide-react-native";
import { type ComponentProps, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Dropdown, type DropdownItemData, useUiTheme } from "rn-ui-kit";

import { isIos } from "@/api/common";

type HeaderActionButtonProps = {
  accessibilityLabel: string;
  circular?: boolean;
  disabled?: boolean;
  label: string;
  onPress?: () => void;
  opacity?: number;
};

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

function HeaderActionButton({
  accessibilityLabel,
  circular = true,
  disabled,
  label,
  onPress,
  opacity,
}: HeaderActionButtonProps) {
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      circular={circular}
      disabled={disabled}
      hitSlop={8}
      native={isIos()}
      nativeButtonStyle="glass"
      onPress={() => {
        onPress?.();
      }}
      style={{ opacity }}
      title={label}
      variant="ghost"
    />
  );
}

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
        headerRight: () => {
          if (isWorkspaceSelectionMode) {
            return (
              <View style={styles.headerActions}>
                <HeaderActionButton
                  accessibilityLabel={areAllWorkspacesSelected ? "取消全选工作区" : "全选工作区"}
                  circular={false}
                  label={areAllWorkspacesSelected ? "取消全选" : "全选"}
                  onPress={onToggleSelectAllWorkspaces}
                />
                <HeaderActionButton
                  accessibilityLabel="完成选择工作区"
                  circular={false}
                  label="完成"
                  onPress={onFinishWorkspaceSelection}
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
