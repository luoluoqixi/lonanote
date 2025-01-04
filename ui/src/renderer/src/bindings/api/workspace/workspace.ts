import { invokeAsync } from '@/bindings/core';

export interface WorkspaceMetadata {
  name: string;
  path: string;
}

export interface WorkspaceSettings {}

export interface Workspace {
  metadata: WorkspaceMetadata;
  settings: WorkspaceSettings;
}

export const workspace = {
  getCurrentWorkspace: async (): Promise<Workspace | null> => {
    return (await invokeAsync('get_current_workspace'))!;
  },
  getInitWorkspace: async (): Promise<Workspace | null> => {
    return (await invokeAsync('get_init_workspace'))!;
  },
  getWorkspacesMetadata: async (): Promise<WorkspaceMetadata[]> => {
    return (await invokeAsync('get_workspaces_metadata'))!;
  },
  openWorkspaceByPath: async (path: string): Promise<Workspace> => {
    return (await invokeAsync('open_workspace_by_path', { path }))!;
  },
};
