import { invokeWorkspaceResult, invokeWorkspaceUnit } from "./invoke_workspace";
import type { WorkspaceHistorySnapshot, WorkspaceId, WorkspaceRelativePath } from "./types";

export const workspaceHistory = {
  list: (
    workspaceId: WorkspaceId,
    path: WorkspaceRelativePath,
  ): Promise<WorkspaceHistorySnapshot[]> =>
    invokeWorkspaceResult("workspace.history.list", { workspaceId, path }),
  read: (
    workspaceId: WorkspaceId,
    path: WorkspaceRelativePath,
    snapshotId: string,
  ): Promise<string> =>
    invokeWorkspaceResult("workspace.history.read", { workspaceId, path, snapshotId }),
  restore: (
    workspaceId: WorkspaceId,
    path: WorkspaceRelativePath,
    snapshotId: string,
  ): Promise<void> =>
    invokeWorkspaceUnit("workspace.history.restore", { workspaceId, path, snapshotId }),
};
