import { invokeAsync } from '@/bindings/core';

import { Workspace, WorkspaceSettings } from './types';
import { getCurrentOpenWorkspace } from './workspaceManager';

const checkCurrentOpenWorkspace = async (): Promise<string> => {
  const path = getCurrentOpenWorkspace();
  if (!path) throw new Error('workspace is not open');
  return path;
};

export const workspace = {
  getCurrentWorkspace: async (): Promise<Workspace | null> => {
    const path = getCurrentOpenWorkspace();
    return path ? (await invokeAsync('get_open_workspace', { path }))! : null;
  },
  getCurrentWorkspaceSettings: async (): Promise<WorkspaceSettings> => {
    const path = await checkCurrentOpenWorkspace();
    return (await invokeAsync('get_open_workspace_settings', { path }))!;
  },
  setCurrentWorkspaceSettings: async (settings: WorkspaceSettings): Promise<Workspace> => {
    const path = await checkCurrentOpenWorkspace();
    return (await invokeAsync('set_open_workspace_settings', { path, settings }))!;
  },
};
