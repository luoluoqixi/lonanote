import type { WorkspaceListItem } from "@/api/commands/workspace";
import type { WorkspaceGroupMode } from "@/components/workspaces/workspace_select/workspace_group";
import type { WorkspaceSortValue } from "@/components/workspaces/workspace_select/workspace_sort";

/** 只投影视图状态，工作区命令和编辑器生命周期仍由工作台持有。 */
export type WorkspaceSelectViewModel = {
  embedded: boolean;
  desktop: boolean;
  currentWorkspaceId: string | null;
  supportsOpenFolder: boolean;
  groupMode: WorkspaceGroupMode;
  sortValue: WorkspaceSortValue;
  workspaces: WorkspaceListItem[];
  selectedWorkspaceIds: string[];
  areAllWorkspacesSelected: boolean;
  isGroupModeDisabled: boolean;
  isOpeningFolder: boolean;
  isOpeningWorkspace: boolean;
  isScanningWorkspaces: boolean;
  isRefreshingWorkspaces: boolean;
  isWorkspaceSelectionMode: boolean;
  isDeletingWorkspace: boolean;
  isUpdatingWorkspace: boolean;
  isLoading: boolean;
  hasError: boolean;
  tracksNavigationBarScrollEdge: boolean;
  usesNativeIosHeader: boolean;
};

export type WorkspaceSelectViewSnapshot = { revision: number; model: WorkspaceSelectViewModel };

export type WorkspaceSelectAction =
  | {
      type:
        | "ready"
        | "create"
        | "openFolder"
        | "scan"
        | "refresh"
        | "pullRefresh"
        | "finishSelection"
        | "toggleSelectAll"
        | "toggleSelection"
        | "openSort"
        | "openGroup"
        | "deleteSelected"
        | "editSelected";
    }
  | { type: "sort"; value: WorkspaceSortValue }
  | { type: "group"; value: WorkspaceGroupMode }
  | { type: "select"; ids: string[] }
  | {
      type:
        | "open"
        | "openInNewWindow"
        | "delete"
        | "edit"
        | "relocate"
        | "rebind"
        | "details"
        | "reveal";
      workspaceId: string;
    };
