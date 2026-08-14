import {
  ArrowDownUp,
  CircleCheck,
  FilePlus2,
  FolderPlus,
  Group,
  Settings,
  SwitchCamera,
} from "@tamagui/lucide-icons-2";
import { type Href, Stack, useRouter } from "expo-router";
import { type ComponentProps, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Menu, type MenuItemData, useMenuTriggerState, useTheme } from "rn-ui-kit";

import { isIos } from "@/api/common";
import { useWorkspaceNavigation } from "@/hooks/workspace";

type WorkspaceExplorerHeaderProps = {
  areAllEntriesSelected: boolean;
  canSelectEntries: boolean;
  isGroupModeDisabled: boolean;
  isSelectionMode: boolean;
  onCreateDirectory: () => void;
  onCreateNote: () => void;
  onFinishSelection: () => void;
  onOpenGroupMode: () => void;
  onOpenSort: () => void;
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
      chromeless
      circular={circular}
      hitSlop={8}
      native={isIos()}
      onPress={onPress}
      opacity={opacity}
      title={label}
    />
  );
}

function HeaderMenuActionButton() {
  const { opacity } = useMenuTriggerState();
  return <HeaderActionButton accessibilityLabel="工作区操作" label="•••" opacity={opacity} />;
}

export function WorkspaceExplorerHeader({
  areAllEntriesSelected,
  canSelectEntries,
  isGroupModeDisabled,
  isSelectionMode,
  onCreateDirectory,
  onCreateNote,
  onFinishSelection,
  onOpenGroupMode,
  onOpenSort,
  onToggleSelectAllEntries,
  onToggleSelectionMode,
  title,
}: WorkspaceExplorerHeaderProps) {
  const router = useRouter();
  const { resetToWorkspaceSelect } = useWorkspaceNavigation();
  const theme = useTheme();
  const accentColor = theme.color10.val as ComponentProps<typeof CircleCheck>["color"];
  const menuItems = useMemo<MenuItemData[]>(
    () => [
      {
        disabled: !canSelectEntries,
        icon: <CircleCheck color={accentColor} size={14} />,
        iconProps: { ios: { name: "checkmark.circle" } },
        label: "选择",
        onPress: onToggleSelectionMode,
        value: "select",
      },
      {
        icon: <FilePlus2 color={accentColor} size={14} />,
        iconProps: { ios: { name: "square.and.pencil" } },
        label: "创建笔记",
        onPress: onCreateNote,
        value: "create-note",
      },
      {
        icon: <FolderPlus color={accentColor} size={14} />,
        iconProps: { ios: { name: "folder.badge.plus" } },
        label: "创建文件夹",
        onPress: onCreateDirectory,
        value: "create-directory",
      },
      { separator: true, value: "separator-01" },
      {
        icon: <ArrowDownUp color={accentColor} size={14} />,
        iconProps: { ios: { name: "arrow.up.arrow.down" } },
        label: "排序方式",
        onPress: onOpenSort,
        value: "sort",
      },
      {
        disabled: isGroupModeDisabled,
        icon: <Group color={accentColor} size={14} />,
        iconProps: { ios: { name: "rectangle.3.group" } },
        label: "分组方式",
        onPress: onOpenGroupMode,
        value: "group",
      },
      { separator: true, value: "separator-02" },
      {
        icon: <SwitchCamera color={accentColor} size={14} />,
        iconProps: { ios: { name: "arrow.left.arrow.right" } },
        label: "切换工作区",
        onPress: resetToWorkspaceSelect,
        value: "switch-workspace",
      },
      {
        icon: <Settings color={accentColor} size={14} />,
        iconProps: { ios: { name: "gearshape" } },
        label: "设置",
        onPress: () => router.push("/settings" as Href),
        value: "settings",
      },
    ],
    [
      accentColor,
      canSelectEntries,
      isGroupModeDisabled,
      onCreateDirectory,
      onCreateNote,
      onOpenGroupMode,
      onOpenSort,
      onToggleSelectionMode,
      resetToWorkspaceSelect,
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

          return <Menu trigger={HeaderMenuActionButton} items={menuItems} nativeHaptics />;
        },
        title,
      }}
    />
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
  },
});
