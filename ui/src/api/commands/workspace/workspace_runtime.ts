import { invoke } from "@/api/invoke";
import { workspaceSessionStore } from "@/stores/workspace";

import type { FileNode, FileTree, WorkspaceRelativePath, WorkspaceState } from "./types";

const invokeWorkspaceRuntime = <T = unknown>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T | undefined> => {
  return invoke<T>(`workspace.runtime.${command}`, args);
};

export const workspaceRuntime = {
  isOpen: async (workspaceId: string): Promise<boolean> => {
    return workspaceId
      ? (await invokeWorkspaceRuntime("is_workspace_open", { workspaceId }))!
      : false;
  },
  open: async (workspaceId: string): Promise<WorkspaceState> => {
    const workspace = (await invokeWorkspaceRuntime<WorkspaceState>("open_workspace", {
      workspaceId,
    }))!;
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
      ? (await invokeWorkspaceRuntime("get_workspace_state", { workspaceId }))!
      : null;
  },
  getFileTree: async (workspaceId: string, recursive = false): Promise<FileTree> => {
    return (await invokeWorkspaceRuntime<FileTree>("get_file_tree", {
      workspaceId,
      recursive,
    }))!;
  },
  getFileNode: async (
    workspaceId: string,
    path: WorkspaceRelativePath,
    recursive = false,
  ): Promise<FileNode | null> => {
    return (await invokeWorkspaceRuntime<FileNode | null>("get_file_node", {
      workspaceId,
      path,
      recursive,
    }))!;
  },
  reinit: async (workspaceId: string): Promise<void> => {
    await invokeWorkspaceRuntime("refresh_workspace", { workspaceId });
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
  getCurrentFileTree: async (recursive = false): Promise<FileTree> => {
    const workspaceId = workspaceSessionStore.requireCurrentWorkspaceId();
    return await workspaceRuntime.getFileTree(workspaceId, recursive);
  },
  getCurrentFileNode: async (
    path: WorkspaceRelativePath,
    recursive = false,
  ): Promise<FileNode | null> => {
    const workspaceId = workspaceSessionStore.requireCurrentWorkspaceId();
    return await workspaceRuntime.getFileNode(workspaceId, path, recursive);
  },
  reinitCurrent: async (): Promise<void> => {
    const workspaceId = workspaceSessionStore.requireCurrentWorkspaceId();
    await workspaceRuntime.reinit(workspaceId);
  },
};
