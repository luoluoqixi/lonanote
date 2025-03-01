import { invokeAsync } from '@/bindings/core';

import { FileTree, Workspace, WorkspaceSettings } from './types';
import { getCurrentOpenWorkspace } from './workspaceManager';

const checkCurrentOpenWorkspace = async (): Promise<string> => {
  const path = getCurrentOpenWorkspace();
  if (!path) throw new Error('workspace is not open');
  return path;
};

export const workspace = {
  isOpenWorkspace: async (path: string): Promise<boolean> => {
    return path ? (await invokeAsync('is_open_workspace', { path }))! : false;
  },
  getWorkspace: async (path: string): Promise<Workspace | null> => {
    return path ? (await invokeAsync('get_open_workspace', { path }))! : null;
  },
  getWorkspaceSettings: async (path: string): Promise<WorkspaceSettings> => {
    return (await invokeAsync('get_open_workspace_settings', { path }))!;
  },
  setWorkspaceSettings: async (path: string, settings: WorkspaceSettings): Promise<Workspace> => {
    return (await invokeAsync('set_open_workspace_settings', { path, settings }))!;
  },
  getOpenWorkspaceFileTree: async (path: string): Promise<FileTree> => {
    return (await invokeAsync('get_open_workspace_file_tree', { path }))!;
  },
  callOpenWorkspaceReinit: async (path: string): Promise<void> => {
    return (await invokeAsync('call_open_workspace_reinit', { path }))!;
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
  reinitCurrentworkspace: async (): Promise<void> => {
    const path = await checkCurrentOpenWorkspace();
    await workspace.callOpenWorkspaceReinit(path);
  },
};
