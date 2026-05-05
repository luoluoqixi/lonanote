import { invoke } from "@/api/invoke";

import { FileNode, FileTree, FileTreeSortType, OpenWorkspace, WorkspaceState } from "./types";
import { workspaceSession } from "./workspaceSession";

const invokeWorkspaceRuntime = (command: string, args?: Record<string, unknown>) => {
  return invoke(`workspace.runtime.${command}`, args);
};

export const workspaceRuntime = {
  importInitWorkspace: async (path: string): Promise<boolean> => {
    return path ? (await invokeWorkspaceRuntime("import_init_workspace", { path }))! : false;
  },
  isOpen: async (workspaceId: string): Promise<boolean> => {
    return workspaceId
      ? (await invokeWorkspaceRuntime("is_workspace_open", { workspaceId }))!
      : false;
  },
  open: async (workspaceId: string): Promise<OpenWorkspace> => {
    const workspace = (await invokeWorkspaceRuntime("open_workspace", { workspaceId }))!;
    workspaceSession.setCurrentWorkspaceId(workspaceId);
    return workspace;
  },
  close: async (workspaceId: string): Promise<void> => {
    await invokeWorkspaceRuntime("close_workspace", { workspaceId });

    if (workspaceSession.getCurrentWorkspaceId() === workspaceId) {
      workspaceSession.clearCurrentWorkspaceId();
    }
  },
  getState: async (workspaceId: string): Promise<WorkspaceState | null> => {
    return workspaceId
      ? (await invokeWorkspaceRuntime("get_open_workspace", { workspaceId }))!
      : null;
  },
  getFileTree: async (workspaceId: string): Promise<FileTree> => {
    return (await invokeWorkspaceRuntime("get_open_workspace_file_tree", { workspaceId }))!;
  },
  reinit: async (workspaceId: string): Promise<void> => {
    return (await invokeWorkspaceRuntime("call_open_workspace_reinit", { workspaceId }))!;
  },
  getFileNode: async (
    workspaceId: string,
    nodePath: string | null | undefined,
    sortType: FileTreeSortType,
    recursive: boolean,
  ): Promise<FileNode> => {
    return (await invokeWorkspaceRuntime("get_open_workspace_file_node", {
      workspaceId,
      nodePath,
      sortType,
      recursive,
    }))!;
  },
  getCurrentWorkspaceId: (): string | null => {
    return workspaceSession.getCurrentWorkspaceId();
  },
  setCurrentWorkspaceId: (workspaceId: string | null): void => {
    workspaceSession.setCurrentWorkspaceId(workspaceId);
  },
  clearCurrentWorkspaceId: (): void => {
    workspaceSession.clearCurrentWorkspaceId();
  },
  getCurrentState: async (): Promise<WorkspaceState | null> => {
    const workspaceId = workspaceSession.requireCurrentWorkspaceId();
    return await workspaceRuntime.getState(workspaceId);
  },
  getCurrentFileTree: async (): Promise<FileTree> => {
    const workspaceId = workspaceSession.requireCurrentWorkspaceId();
    return await workspaceRuntime.getFileTree(workspaceId);
  },
  reinitCurrent: async (): Promise<void> => {
    const workspaceId = workspaceSession.requireCurrentWorkspaceId();
    await workspaceRuntime.reinit(workspaceId);
  },
  getCurrentFileNode: async (
    nodePath: string | null | undefined,
    sortType: FileTreeSortType,
    recursive: boolean,
  ): Promise<FileNode> => {
    const workspaceId = workspaceSession.requireCurrentWorkspaceId();
    return await workspaceRuntime.getFileNode(workspaceId, nodePath, sortType, recursive);
  },
};
