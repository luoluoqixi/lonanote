import { StyleSheet, View } from "react-native";
import {
  NativeList,
  NativeListButtonItem,
  NativeListCustomItem,
  NativeListNavigationItem,
  NativeListSection,
  Text,
} from "rn-ui-kit";

import type { WorkspaceListItem } from "@/api/commands/workspace";

import { type WorkspaceSortValue, getWorkspaceSubtitle } from "./workspace_sort";

type WorkspaceSelectListProps = {
  hasError: boolean;
  isDeletingWorkspace: boolean;
  isLoading: boolean;
  isOpeningWorkspace: boolean;
  isUpdatingWorkspace: boolean;
  isWorkspaceSelectionMode: boolean;
  onCreateWorkspace: () => void;
  onDeleteWorkspace: (workspaceItem: WorkspaceListItem) => void;
  onEditWorkspace: (workspaceItem: WorkspaceListItem) => void;
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
  isDeletingWorkspace,
  isLoading,
  isOpeningWorkspace,
  isUpdatingWorkspace,
  isWorkspaceSelectionMode,
  onCreateWorkspace,
  onDeleteWorkspace,
  onEditWorkspace,
  onRefresh,
  onSelectedWorkspaceIdsChange,
  onWorkspacePress,
  selectedWorkspaceIds,
  sortValue,
  tracksNavigationBarScrollEdge,
  usesNativeIosHeader,
  workspaces,
}: WorkspaceSelectListProps) {
  const statusMessage = isLoading
    ? "正在加载工作区"
    : hasError && workspaces.length === 0
      ? "工作区加载失败"
      : workspaces.length === 0
        ? "暂无工作区"
        : null;
  const showCreateWorkspaceButton = !isLoading && !hasError;
  const isInteractionDisabled = isOpeningWorkspace || isDeletingWorkspace || isUpdatingWorkspace;

  return (
    <NativeList
      automaticallyAdjustsScrollIndicatorInsets={usesNativeIosHeader ? true : undefined}
      contentMarginBottom={isWorkspaceSelectionMode ? 120 : undefined}
      contentInsetAdjustmentBehavior={tracksNavigationBarScrollEdge ? "automatic" : undefined}
      editMode={isWorkspaceSelectionMode}
      onRefresh={onRefresh}
      onSelectedIdsChange={onSelectedWorkspaceIdsChange}
      selectedIds={selectedWorkspaceIds}
      style={styles.list}
      tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
    >
      <NativeListSection title="选择工作区">
        {statusMessage ? (
          <NativeListCustomItem paddingVertical={0}>
            <WorkspaceSelectStatus message={statusMessage} />
          </NativeListCustomItem>
        ) : (
          workspaces.map((workspaceItem) => (
            <NativeListNavigationItem
              contextMenuProps={{
                items: [
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
              icon={
                <Text color="$color10" fontSize="$7">
                  ▣
                </Text>
              }
              iconSize={24}
              iconSlotWidth={28}
              key={workspaceItem.id}
              nativeScrollId={workspaceItem.id}
              onPress={() => onWorkspacePress(workspaceItem.id)}
              sfSymbol="folder.fill"
              subtitle={getWorkspaceSubtitle(workspaceItem, sortValue)}
              title={workspaceItem.displayName}
              titleFontSize={16}
            />
          ))
        )}
        {showCreateWorkspaceButton ? (
          <NativeListButtonItem selectionDisabled onPress={onCreateWorkspace} title="创建工作区" />
        ) : null}
      </NativeListSection>
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
