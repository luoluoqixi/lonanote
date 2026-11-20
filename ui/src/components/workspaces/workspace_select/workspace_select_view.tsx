import type {
  WorkspaceSelectAction,
  WorkspaceSelectViewModel,
} from "@/api/common/dialogs/workspace_select_model";

import { WORKSPACE_GROUP_MODE_GROUPS, type WorkspaceGroupMode } from "./workspace_group";
import { WorkspaceSelectHeader, type WorkspaceSelectHeaderProps } from "./workspace_select_header";
import { WorkspaceSelectList } from "./workspace_select_list";
import { WorkspaceSelectionToolbar } from "./workspace_selection_toolbar";
import { WORKSPACE_SORT_ITEM_GROUPS, type WorkspaceSortValue } from "./workspace_sort";

/** 原生窗口与应用内 Dialog 共享同一套完整工作区界面。 */
export function WorkspaceSelectView({
  model: m,
  onAction,
  navigationHeader,
}: {
  model: WorkspaceSelectViewModel;
  navigationHeader?: Pick<WorkspaceSelectHeaderProps, "onOpenSettings" | "renderNavigationHeader">;
  onAction: (action: WorkspaceSelectAction) => Promise<void>;
}) {
  const act = (action: WorkspaceSelectAction) => {
    void onAction(action);
  };
  return (
    <>
      <WorkspaceSelectHeader
        {...navigationHeader}
        embedded={m.embedded}
        sortMenuItems={
          m.embedded
            ? WORKSPACE_SORT_ITEM_GROUPS.flatMap((group) =>
                group.items.map((item) => ({
                  value: item.value,
                  label: item.label,
                  checkbox: true,
                  selected: item.value === m.sortValue,
                  onPress: () => act({ type: "sort", value: item.value as WorkspaceSortValue }),
                })),
              )
            : undefined
        }
        groupMenuItems={
          m.embedded
            ? WORKSPACE_GROUP_MODE_GROUPS.flatMap((group) =>
                group.items.map((item) => ({
                  value: item.value,
                  label: item.label,
                  checkbox: true,
                  selected: item.value === m.groupMode,
                  onPress: () => act({ type: "group", value: item.value as WorkspaceGroupMode }),
                })),
              )
            : undefined
        }
        areAllWorkspacesSelected={m.areAllWorkspacesSelected}
        canSelectWorkspaces={m.workspaces.length > 0}
        isGroupModeDisabled={m.isGroupModeDisabled}
        isScanningWorkspaces={m.isScanningWorkspaces}
        isRefreshingWorkspaces={m.isRefreshingWorkspaces}
        isWorkspaceSelectionMode={m.isWorkspaceSelectionMode}
        isOpeningFolder={m.isOpeningFolder}
        onOpenFolder={m.supportsOpenFolder ? () => act({ type: "openFolder" }) : undefined}
        onCreateWorkspace={() => act({ type: "create" })}
        onFinishWorkspaceSelection={() => act({ type: "finishSelection" })}
        onOpenWorkspaceGroupMode={() => act({ type: "openGroup" })}
        onOpenWorkspaceSort={() => act({ type: "openSort" })}
        onScanWorkspaces={() => act({ type: "scan" })}
        onRefreshWorkspaces={m.desktop ? () => act({ type: "refresh" }) : undefined}
        onToggleSelectAllWorkspaces={() => act({ type: "toggleSelectAll" })}
        onToggleWorkspaceSelectionMode={() => act({ type: "toggleSelection" })}
      />
      <WorkspaceSelectList
        embedded={m.embedded}
        currentWorkspaceId={m.currentWorkspaceId}
        groupMode={m.groupMode}
        hasError={m.hasError}
        isDeletingWorkspace={m.isDeletingWorkspace}
        isLoading={m.isLoading}
        isOpeningWorkspace={m.isOpeningWorkspace}
        isScanningWorkspaces={m.isScanningWorkspaces}
        isUpdatingWorkspace={m.isUpdatingWorkspace}
        isWorkspaceSelectionMode={m.isWorkspaceSelectionMode}
        onCreateWorkspace={() => act({ type: "create" })}
        onDeleteWorkspace={(item) => act({ type: "delete", workspaceId: item.id })}
        onEditWorkspace={(item) => act({ type: "edit", workspaceId: item.id })}
        onRelocateWorkspace={(item) => act({ type: "relocate", workspaceId: item.id })}
        onRebindWorkspace={(item) => act({ type: "rebind", workspaceId: item.id })}
        onWorkspaceDetails={(item) => act({ type: "details", workspaceId: item.id })}
        onRevealWorkspace={(item) => act({ type: "reveal", workspaceId: item.id })}
        onRefresh={() => onAction({ type: "pullRefresh" })}
        onSelectedWorkspaceIdsChange={(ids) =>
          act({ type: "select", ids: ids.filter((id): id is string => typeof id === "string") })
        }
        onOpenInNewWindow={(workspaceId) => act({ type: "openInNewWindow", workspaceId })}
        onWorkspacePress={(workspaceId) => act({ type: "open", workspaceId })}
        selectedWorkspaceIds={m.selectedWorkspaceIds}
        sortValue={m.sortValue}
        tracksNavigationBarScrollEdge={m.tracksNavigationBarScrollEdge}
        usesNativeIosHeader={m.usesNativeIosHeader}
        workspaces={m.workspaces}
      />
      {m.isWorkspaceSelectionMode ? (
        <WorkspaceSelectionToolbar
          isDeleting={m.isDeletingWorkspace}
          isUpdating={m.isUpdatingWorkspace}
          onDelete={() => act({ type: "deleteSelected" })}
          onEdit={() => act({ type: "editSelected" })}
          selectedCount={m.selectedWorkspaceIds.length}
        />
      ) : null}
    </>
  );
}
