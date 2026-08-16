import { Folder, Info } from "@tamagui/lucide-icons-2";
import { type ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import {
  NativeList,
  NativeListButtonItem,
  NativeListCustomItem,
  NativeListNavigationItem,
  NativeListSection,
  Text,
  useTheme,
} from "rn-ui-kit";

import type { WorkspaceListItem } from "@/api/commands/workspace";

import { type WorkspaceGroupMode, groupWorkspaces } from "./workspace_group";
import { type WorkspaceSortValue, getWorkspaceSubtitle } from "./workspace_sort";

type WorkspaceSelectListProps = {
  hasError: boolean;
  groupMode: WorkspaceGroupMode;
  isDeletingWorkspace: boolean;
  isLoading: boolean;
  isOpeningWorkspace: boolean;
  isUpdatingWorkspace: boolean;
  isWorkspaceSelectionMode: boolean;
  onCreateWorkspace: () => void;
  onDeleteWorkspace: (workspaceItem: WorkspaceListItem) => void;
  onEditWorkspace: (workspaceItem: WorkspaceListItem) => void;
  onWorkspaceDetails: (workspaceItem: WorkspaceListItem) => void;
  onRefresh: () => Promise<void>;
  onSelectedWorkspaceIdsChange: (selectedIds: Array<string | number>) => void;
  onWorkspacePress: (workspaceId: string) => void;
  selectedWorkspaceIds: string[];
  sortValue: WorkspaceSortValue;
  tracksNavigationBarScrollEdge: boolean;
  usesNativeIosHeader: boolean;
  workspaces: WorkspaceListItem[];
};

function WorkspaceSelectStatus({ message }: { message: string }) {
  return (
    <View style={styles.status}>
      <Text color="$gray11" fontSize="$4">
        {message}
      </Text>
    </View>
  );
}

export function WorkspaceSelectList({
  hasError,
  groupMode,
  isDeletingWorkspace,
  isLoading,
  isOpeningWorkspace,
  isUpdatingWorkspace,
  isWorkspaceSelectionMode,
  onCreateWorkspace,
  onDeleteWorkspace,
  onEditWorkspace,
  onWorkspaceDetails,
  onRefresh,
  onSelectedWorkspaceIdsChange,
  onWorkspacePress,
  selectedWorkspaceIds,
  sortValue,
  tracksNavigationBarScrollEdge,
  usesNativeIosHeader,
  workspaces,
}: WorkspaceSelectListProps) {
  const theme = useTheme();
  const accentColor = theme.color10.val as ComponentProps<typeof Folder>["color"];
  const statusMessage = isLoading
    ? "正在加载工作区"
    : hasError && workspaces.length === 0
      ? "工作区加载失败"
      : workspaces.length === 0
        ? "暂无工作区"
        : null;
  const showCreateWorkspaceButton = !isLoading && !hasError;
  const isInteractionDisabled = isOpeningWorkspace || isDeletingWorkspace || isUpdatingWorkspace;
  const sections = groupWorkspaces(workspaces, groupMode, sortValue);

  return (
    <NativeList
      automaticallyAdjustsScrollIndicatorInsets={usesNativeIosHeader ? true : undefined}
      contentMarginBottom={isWorkspaceSelectionMode ? 120 : 24}
      contentInsetAdjustmentBehavior={usesNativeIosHeader ? "automatic" : undefined}
      editMode={isWorkspaceSelectionMode}
      onRefresh={onRefresh}
      onSelectedIdsChange={onSelectedWorkspaceIdsChange}
      selectedIds={selectedWorkspaceIds}
      style={styles.list}
      tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
    >
      {statusMessage ? (
        <NativeListSection title="选择工作区">
          <NativeListCustomItem paddingVertical={0}>
            <WorkspaceSelectStatus message={statusMessage} />
          </NativeListCustomItem>
        </NativeListSection>
      ) : (
        sections.map((section) => (
          <NativeListSection key={section.id} title={section.title}>
            {section.workspaces.map((workspaceItem) => (
              <NativeListNavigationItem
                contextMenuProps={{
                  items: [
                    {
                      icon: <Info color={accentColor} size={14} />,
                      label: "查看详情",
                      onSelect: () => onWorkspaceDetails(workspaceItem),
                      value: `details-workspace-${workspaceItem.id}`,
                    },
                    {
                      label: "编辑工作区",
                      onSelect: () => onEditWorkspace(workspaceItem),
                      value: `edit-workspace-${workspaceItem.id}`,
                    },
                    {
                      destructive: true,
                      label: "删除工作区",
                      onSelect: () => onDeleteWorkspace(workspaceItem),
                      value: `delete-workspace-${workspaceItem.id}`,
                    },
                  ],
                }}
                disabled={isInteractionDisabled}
                icon={<Folder color={accentColor} fill={theme.color10.val} size={24} />}
                iconColor={theme.color10.val}
                iconSize={24}
                iconSlotWidth={30}
                key={workspaceItem.id}
                nativeScrollId={workspaceItem.id}
                onPress={() => onWorkspacePress(workspaceItem.id)}
                sfSymbol="folder.fill"
                subtitle={getWorkspaceSubtitle(workspaceItem, sortValue)}
                title={workspaceItem.displayName}
                titleFontSize={16}
              />
            ))}
          </NativeListSection>
        ))
      )}
      {showCreateWorkspaceButton ? (
        <NativeListSection>
          <NativeListButtonItem selectionDisabled onPress={onCreateWorkspace} title="创建工作区" />
        </NativeListSection>
      ) : null}
    </NativeList>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  status: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    width: "100%",
  },
});
