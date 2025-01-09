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
  setCurrentWorkspaceMetadata: async (metadata: WorkspaceMetadata) => {
    return (await invokeAsync('set_current_workspace_metadata', metadata))!;
  },
  setCurrentWorkspaceSettings: async (metadata: WorkspaceSettings) => {
    return (await invokeAsync('set_current_workspace_settings', metadata))!;
  },
  setWorkspaceMetadata: async (path: string, metadata: WorkspaceMetadata) => {
    return (await invokeAsync('set_workspace_metadata', { path, metadata }))!;
  },
  getInitWorkspace: async (): Promise<Workspace | null> => {
    return (await invokeAsync('get_init_workspace'))!;
  },
  getWorkspacesMetadata: async (): Promise<WorkspaceMetadata[]> => {
    return (await invokeAsync('get_workspaces_metadata'))!;
  },
  openWorkspaceByPath: async (path: string): Promise<Workspace> => {
    return (await invokeAsync('open_workspace_by_path', path))!;
  },
};
