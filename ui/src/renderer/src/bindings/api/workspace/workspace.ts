import { invokeAsync } from '@/bindings/core';

export interface WorkspaceMetadata {
  name: string;
  path: string;
  rootPath: string;
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
  setCurrentWorkspaceRootPath: async (newPath: string, isMove: boolean) => {
    return (await invokeAsync('set_current_workspace_root_path', { newPath, isMove }))!;
  },
  setCurrentWorkspaceName: async (newName: string, isMove: boolean) => {
    return (await invokeAsync('set_current_workspace_name', { newName, isMove }))!;
  },
  setCurrentWorkspaceSettings: async (settings: WorkspaceSettings) => {
    return (await invokeAsync('set_current_workspace_settings', { settings }))!;
  },
  setWorkspacePath: async (path: string, newPath: string, isMove: boolean) => {
    return (await invokeAsync('set_workspace_path', { path, newPath, isMove }))!;
  },
  setWorkspaceName: async (path: string, newName: string, isMove: boolean) => {
    return (await invokeAsync('set_workspace_name', { path, newName, isMove }))!;
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
