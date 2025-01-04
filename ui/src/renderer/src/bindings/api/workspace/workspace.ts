import { invokeAsync } from '@/bindings/core';

export interface WorkspaceMetadata {
  name: string;
  path: string;
}

export interface WorkspaceSettings {
  theme: string;
}

export const workspace = {
  getCurrentWorkspaceMetadata: async (): Promise<WorkspaceMetadata | null> => {
    return (await invokeAsync('get_current_workspace_metadata'))!;
  },
  getCurrentWorkspaceSettings: async (): Promise<WorkspaceSettings | null> => {
    return (await invokeAsync('get_current_workspace_settings'))!;
  },
  getWorkspacesMetadata: async (): Promise<WorkspaceMetadata[]> => {
    return (await invokeAsync('get_workspaces_metadata'))!;
  },
};
