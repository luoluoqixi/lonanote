import { invokeAsync } from '@/bindings/core';

import { Workspace, WorkspaceSettings } from './types';
import { getCurrentOpenWorkspace } from './workspaceManager';

const checkCurrentOpenWorkspace = async (): Promise<string> => {
  const path = getCurrentOpenWorkspace();
  if (!path) throw new Error('workspace is not open');
  return path;
};

export const workspace = {
  getWorkspace: async (path: string): Promise<Workspace | null> => {
    return path ? (await invokeAsync('get_open_workspace', { path }))! : null;
  },
  getWorkspaceSettings: async (path: string): Promise<WorkspaceSettings> => {
    return (await invokeAsync('get_open_workspace_settings', { path }))!;
  },
  setWorkspaceSettings: async (path: string, settings: WorkspaceSettings): Promise<Workspace> => {
    return (await invokeAsync('set_open_workspace_settings', { path, settings }))!;
  },
  startIndexingWorkspace: async (path: string): Promise<WorkspaceSettings> => {
    return (await invokeAsync('start_indexing_open_workspace', { path }))!;
  },
  stopIndexingWorkspace: async (path: string): Promise<WorkspaceSettings> => {
    return (await invokeAsync('stop_indexing_open_workspace', { path }))!;
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
  startIndexingCurrentworkspace: async (): Promise<void> => {
    const path = await checkCurrentOpenWorkspace();
    await workspace.startIndexingWorkspace(path);
  },
  stopIndexingCurrentworkspace: async (): Promise<void> => {
    const path = await checkCurrentOpenWorkspace();
    await workspace.stopIndexingWorkspace(path);
  },
};
