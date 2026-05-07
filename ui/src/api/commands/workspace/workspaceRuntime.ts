import { invoke } from "@/api/invoke";
import { workspaceSessionStore } from "@/stores/workspace";

import { FileNode, FileTree, FileTreeSortType, WorkspaceState } from "./types";

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
  open: async (workspaceId: string): Promise<WorkspaceState> => {
    const workspace = (await invokeWorkspaceRuntime("open_workspace", { workspaceId }))!;
    workspaceSessionStore.setCurrentWorkspaceId(workspaceId);
    return workspace;
  },
  close: async (workspaceId: string): Promise<void> => {
    await invokeWorkspaceRuntime("close_workspace", { workspaceId });

    if (workspaceSessionStore.getCurrentWorkspaceId() === workspaceId) {
      workspaceSessionStore.clearCurrentWorkspaceId();
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
    return workspaceSessionStore.getCurrentWorkspaceId();
  },
  setCurrentWorkspaceId: (workspaceId: string | null): void => {
    workspaceSessionStore.setCurrentWorkspaceId(workspaceId);
  },
  clearCurrentWorkspaceId: (): void => {
    workspaceSessionStore.clearCurrentWorkspaceId();
  },
  getCurrentState: async (): Promise<WorkspaceState | null> => {
    const workspaceId = workspaceSessionStore.requireCurrentWorkspaceId();
    return await workspaceRuntime.getState(workspaceId);
  },
  getCurrentFileTree: async (): Promise<FileTree> => {
    const workspaceId = workspaceSessionStore.requireCurrentWorkspaceId();
    return await workspaceRuntime.getFileTree(workspaceId);
  },
  reinitCurrent: async (): Promise<void> => {
    const workspaceId = workspaceSessionStore.requireCurrentWorkspaceId();
    await workspaceRuntime.reinit(workspaceId);
  },
  getCurrentFileNode: async (
    nodePath: string | null | undefined,
    sortType: FileTreeSortType,
    recursive: boolean,
  ): Promise<FileNode> => {
    const workspaceId = workspaceSessionStore.requireCurrentWorkspaceId();
    return await workspaceRuntime.getFileNode(workspaceId, nodePath, sortType, recursive);
  },
};
