import { invokeAsync } from '@/bindings/core';

import { WorkspaceMetadata, WorkspaceSaveData } from './types';
import { workspace } from './workspace';

let currentWorkspace: string | null = null;
export const getCurrentOpenWorkspace = (): string | null => {
  if (currentWorkspace == null) {
    const ws = window.getSearchParams?.('ws');
    if (ws) {
      currentWorkspace = ws as string;
    }
  }
  return currentWorkspace;
};

export const setCurrentOpenWorkspace = async (path: string | null) => {
  window.setSearchParams?.('ws', path);
  window.clearFileHistory?.();
  currentWorkspace = path;
};

export const formatPath = (path: string) => {
  return path.replace(/\\/g, '/');
};

export const workspaceManager = {
  initSetup: async (path: string) => {
    return await invokeAsync('workspace.init_setup', { path });
  },
  setWorkspaceRootPath: async (path: string, newPath: string, isMove: boolean) => {
    return (await invokeAsync('workspace.set_workspace_root_path', { path, newPath, isMove }))!;
  },
  setWorkspaceName: async (path: string, newName: string, isMove: boolean) => {
    return (await invokeAsync('workspace.set_workspace_name', { path, newName, isMove }))!;
  },
  removeWorkspace: async (path: string) => {
    return (await invokeAsync('workspace.remove_workspace', { path }))!;
  },
  getWorkspacesMetadata: async (): Promise<WorkspaceMetadata[]> => {
    return (await invokeAsync('workspace.get_workspaces_metadata'))!;
  },
  openWorkspaceByPath: async (path: string): Promise<void> => {
    const start = performance.now();
    path = formatPath(path);
    const isOpen = await workspace.isOpenWorkspace(path);
    if (isOpen) {
      throw new Error(`workspace has been opened: ${path}`);
    }
    await invokeAsync('workspace.open_workspace_by_path', { path });
    await setCurrentOpenWorkspace(path);
    console.log(`open workspace: ${(performance.now() - start).toFixed(2)}ms`);
  },
  createWorkspace: async (path: string): Promise<void> => {
    const start = performance.now();
    path = formatPath(path);
    await invokeAsync('workspace.create_workspace', { path });
    await setCurrentOpenWorkspace(path);
    console.log(`create and open workspace: ${(performance.now() - start).toFixed(2)}ms`);
  },
  unloadWorkspaceByPath: async (path: string): Promise<void> => {
    await setCurrentOpenWorkspace(null);
    await invokeAsync('workspace.unload_workspace_by_path', { path });
    // console.info('unload workspace:', path);
  },
  getLastWorkspace: async (): Promise<string | null> => {
    return (await invokeAsync('workspace.get_last_workspace'))!;
  },
  checkWorkspacePathExist: async (workspacePath: string): Promise<boolean | null> => {
    return (await invokeAsync('workspace.check_workspace_path_exist', { workspacePath }))!;
  },
  checkWorkspacePathLegal: async (workspacePath: string): Promise<boolean | null> => {
    return (await invokeAsync('workspace.check_workspace_path_legal', { workspacePath }))!;
  },
  getWorkspaceSavedata: async (workspacePath: string): Promise<WorkspaceSaveData> => {
    return (await invokeAsync('workspace.get_workspace_savedata', { workspacePath }))!;
  },
  setWorkspaceSavedata: async (workspacePath: string, data: WorkspaceSaveData): Promise<void> => {
    return (await invokeAsync('workspace.set_workspace_savedata', { workspacePath, data }))!;
  },
};
