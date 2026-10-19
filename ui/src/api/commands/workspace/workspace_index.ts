import { invokeWorkspaceResult, invokeWorkspaceUnit } from "./invoke_workspace";
import type { WorkspaceDirectorySnapshot, WorkspaceId, WorkspaceRelativePath } from "./types";

export const workspaceIndex = {
  getDirectory: (
    workspaceId: WorkspaceId,
    path: WorkspaceRelativePath,
    { reload = true }: { reload?: boolean } = {},
  ): Promise<WorkspaceDirectorySnapshot> => {
    return invokeWorkspaceResult("workspace.index.get_directory", { workspaceId, path, reload });
  },
  refresh: (workspaceId: WorkspaceId): Promise<void> => {
    return invokeWorkspaceUnit("workspace.index.refresh", { workspaceId });
  },
};
