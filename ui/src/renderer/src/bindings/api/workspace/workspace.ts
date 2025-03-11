import { invokeAsync } from '@/bindings/core';

import { FileTree, FileTreeSortType, Workspace, WorkspaceSettings } from './types';
import { getCurrentOpenWorkspace } from './workspaceManager';

const checkCurrentOpenWorkspace = async (): Promise<string> => {
  const path = getCurrentOpenWorkspace();
  if (!path) throw new Error('workspace is not open');
  return path;
};

export const workspace = {
  isOpenWorkspace: async (path: string): Promise<boolean> => {
    return path ? (await invokeAsync('workspace.is_open_workspace', { path }))! : false;
  },
  getWorkspace: async (path: string): Promise<Workspace | null> => {
    return path ? (await invokeAsync('workspace.get_open_workspace', { path }))! : null;
  },
  getWorkspaceSettings: async (path: string): Promise<WorkspaceSettings> => {
    return (await invokeAsync('workspace.get_open_workspace_settings', { path }))!;
  },
  setWorkspaceSettings: async (path: string, settings: WorkspaceSettings): Promise<Workspace> => {
    return (await invokeAsync('workspace.set_open_workspace_settings', { path, settings }))!;
  },
  getOpenWorkspaceFileTree: async (path: string): Promise<FileTree> => {
    return (await invokeAsync('workspace.get_open_workspace_file_tree', { path }))!;
  },
  setOpenWorkspaceFileTreeSortType: async (
    path: string,
    sortType: FileTreeSortType,
  ): Promise<void> => {
    return (await invokeAsync('workspace.set_open_workspace_file_tree_sort_type', {
      path,
      sortType,
    }))!;
  },
  callOpenWorkspaceReinit: async (path: string): Promise<void> => {
    return (await invokeAsync('workspace.call_open_workspace_reinit', { path }))!;
  },
  getCurrentWorkspace: async (): Promise<Workspace | null> => {
    const path = getCurrentOpenWorkspace();
    return path ? await workspace.getWorkspace(path) : null;
  },
  getCurrentWorkspaceSettings: async (): Promise<WorkspaceSettings> => {
    const path = await checkCurrentOpenWorkspace();
    return await workspace.getWorkspaceSettings(path);
  },
  setCurrentWorkspaceSettings: async (settings: WorkspaceSettings): Promise<Workspace> => {
    const path = await checkCurrentOpenWorkspace();
    return await workspace.setWorkspaceSettings(path, settings);
  },
  getCurrentworkspaceFileTree: async (): Promise<FileTree> => {
    const path = await checkCurrentOpenWorkspace();
    return await workspace.getOpenWorkspaceFileTree(path);
  },
  setCurrentWorkspaceFileTreeSortType: async (sortType: FileTreeSortType): Promise<void> => {
    const path = await checkCurrentOpenWorkspace();
    return await workspace.setOpenWorkspaceFileTreeSortType(path, sortType);
  },
  reinitCurrentworkspace: async (): Promise<void> => {
    const path = await checkCurrentOpenWorkspace();
    await workspace.callOpenWorkspaceReinit(path);
  },
};
