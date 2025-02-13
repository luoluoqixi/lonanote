import { invokeAsync, isElectron, isTauri } from '@/bindings/core';

import { WorkspaceMetadata, WorkspaceSaveData } from './types';
import { workspace } from './workspace';

let currentWorkspace: string | null = null;
export const getCurrentOpenWorkspace = (): string | null => {
  return currentWorkspace;
};

export const formatPath = (path: string) => {
  return path.replace(/\\/g, '/');
};

export const initGetWorkspace = async () => {
  if (currentWorkspace) return;
  if (isTauri) {
    const lastWorkspace = await workspaceManager.getLastWorkspace();
    if (lastWorkspace) {
      await workspaceManager.openWorkspaceByPath(lastWorkspace);
    }
  } else if (isElectron && window.api) {
    const openWorkspace = await window.api.workspace.getCurrentWorkspace();
    if (openWorkspace != null) {
      currentWorkspace = openWorkspace;
    } else {
      const lastWorkspace = await workspaceManager.getLastWorkspace();
      if (lastWorkspace) {
        // 当前打开的所有workspace中没有lastWorkspace的情况下, 才打开该workspace
        const openWorkspaces = await window.api.workspace.getCurrentWorkspaces();
        if (openWorkspaces.length == 0 || openWorkspaces.indexOf(lastWorkspace) < 0) {
          await workspaceManager.openWorkspaceByPath(lastWorkspace);
        }
      }
    }
  }
  return workspace.getCurrentWorkspace();
};

const setCurrentWorkspace = async (path: string | null) => {
  path = path ? formatPath(path) : null;
  if (isElectron && window.api) {
    window.api.workspace.setCurrentWorkspace(path);
  }
  currentWorkspace = path;
};

export const workspaceManager = {
  setWorkspaceRootPath: async (path: string, newPath: string, isMove: boolean) => {
    return (await invokeAsync('set_workspace_root_path', { path, newPath, isMove }))!;
  },
  setWorkspaceName: async (path: string, newName: string, isMove: boolean) => {
    return (await invokeAsync('set_workspace_name', { path, newName, isMove }))!;
  },
  removeWorkspace: async (path: string) => {
    return (await invokeAsync('remove_workspace', { path }))!;
  },
  getWorkspacesMetadata: async (): Promise<WorkspaceMetadata[]> => {
    return (await invokeAsync('get_workspaces_metadata'))!;
  },
  openWorkspaceByPath: async (path: string): Promise<void> => {
    if (window.api) {
      const openWorkspaces = await window.api.workspace.getCurrentWorkspaces();
      if (openWorkspaces.indexOf(formatPath(path)) >= 0) {
        throw new Error(`workspace has been opened: ${path}`);
      }
    }
    await invokeAsync('open_workspace_by_path', { path });
    await setCurrentWorkspace(path);
    console.info('open workspace:', currentWorkspace);
  },
  unloadWorkspaceByPath: async (path: string): Promise<void> => {
    await invokeAsync('unload_workspace_by_path', { path });
    await setCurrentWorkspace(null);
    console.info('unload workspace:', path);
  },
  getLastWorkspace: async (): Promise<string | null> => {
    return (await invokeAsync('get_last_workspace'))!;
  },
  checkWorkspacePathExist: async (workspacePath: string): Promise<boolean | null> => {
    return (await invokeAsync('check_workspace_path_exist', { workspacePath }))!;
  },
  checkWorkspacePathLegal: async (workspacePath: string): Promise<boolean | null> => {
    return (await invokeAsync('check_workspace_path_legal', { workspacePath }))!;
  },
  getWorkspaceSavedata: async (workspacePath: string): Promise<WorkspaceSaveData> => {
    return (await invokeAsync('get_workspace_savedata', { workspacePath }))!;
  },
  setWorkspaceSavedata: async (workspacePath: string, data: WorkspaceSaveData): Promise<void> => {
    return (await invokeAsync('set_workspace_savedata', { workspacePath, data }))!;
  },
};
