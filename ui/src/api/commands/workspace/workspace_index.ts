import { invokeWorkspaceResult, invokeWorkspaceUnit } from "./invoke_workspace";
import type { FileNode, FileTree, WorkspaceId, WorkspaceRelativePath } from "./types";

export const workspaceIndex = {
  getTree: (workspaceId: WorkspaceId, recursive = false): Promise<FileTree> => {
    return invokeWorkspaceResult("workspace.index.get_tree", { workspaceId, recursive });
  },

  getNode: (
    workspaceId: WorkspaceId,
    path: WorkspaceRelativePath,
    recursive = false,
  ): Promise<FileNode> => {
    return invokeWorkspaceResult("workspace.index.get_node", { workspaceId, path, recursive });
  },

  refresh: (workspaceId: WorkspaceId): Promise<void> => {
    return invokeWorkspaceUnit("workspace.index.refresh", { workspaceId });
  },
};
