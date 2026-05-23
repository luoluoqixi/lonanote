import { invoke } from "@/api/invoke";

import {
  WorkspaceRecord,
  WorkspaceRoot,
  WorkspaceSaveData,
  WorkspaceSettings,
  WorkspaceSyncSummary,
} from "./types";

export const normalizeWorkspacePath = (path: string) => {
  return path.replace(/\\/g, "/");
};

const invokeWorkspaceRegistry = <T = unknown>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T | undefined> => {
  return invoke<T>(`workspace.registry.${command}`, args);
};

export const workspaceRegistry = {
  initSetup: async (path: string) => {
    return await invokeWorkspaceRegistry("init_setup", { path: normalizeWorkspacePath(path) });
  },
  listRecords: async (): Promise<WorkspaceRecord[]> => {
    return (await invokeWorkspaceRegistry("list_workspace_records"))!;
  },
  getRecord: async (workspaceId: string): Promise<WorkspaceRecord> => {
    return (await invokeWorkspaceRegistry("get_workspace_record", { workspaceId }))!;
  },
  create: async (path: string): Promise<WorkspaceRecord> => {
    return (await invokeWorkspaceRegistry("create_workspace", {
      path: normalizeWorkspacePath(path),
    }))!;
  },
  createInRoot: async (rootKey: string, name: string): Promise<WorkspaceRecord> => {
    return (await invokeWorkspaceRegistry("create_workspace_in_root", { rootKey, name }))!;
  },
  rename: async (
    workspaceId: string,
    newName: string,
    isMove: boolean,
  ): Promise<WorkspaceRecord> => {
    return (await invokeWorkspaceRegistry("rename_workspace", { workspaceId, newName, isMove }))!;
  },
  move: async (workspaceId: string, newPath: string, isMove: boolean): Promise<WorkspaceRecord> => {
    return (await invokeWorkspaceRegistry("move_workspace", {
      workspaceId,
      newPath: normalizeWorkspacePath(newPath),
      isMove,
    }))!;
  },
  remove: async (workspaceId: string, deleteFile = false): Promise<void> => {
    return (await invokeWorkspaceRegistry("remove_workspace", { workspaceId, deleteFile }))!;
  },
  getLastWorkspaceId: async (): Promise<string | null> => {
    return (await invokeWorkspaceRegistry("get_last_workspace_id"))!;
  },
  getSettings: async (workspaceId: string): Promise<WorkspaceSettings> => {
    return (await invokeWorkspaceRegistry("get_workspace_settings", { workspaceId }))!;
  },
  setSettings: async (
    workspaceId: string,
    settings: WorkspaceSettings,
  ): Promise<WorkspaceSettings> => {
    return (await invokeWorkspaceRegistry("set_workspace_settings", { workspaceId, settings }))!;
  },
  getSaveData: async (workspaceId: string): Promise<WorkspaceSaveData> => {
    return (await invokeWorkspaceRegistry("get_workspace_savedata", { workspaceId }))!;
  },
  setSaveData: async (workspaceId: string, data: WorkspaceSaveData): Promise<void> => {
    return (await invokeWorkspaceRegistry("set_workspace_savedata", { workspaceId, data }))!;
  },
  setRoots: async (roots: WorkspaceRoot[]): Promise<WorkspaceSyncSummary> => {
    return (await invokeWorkspaceRegistry("set_workspace_roots", { roots }))!;
  },
  getRoots: async (): Promise<WorkspaceRoot[]> => {
    return (await invokeWorkspaceRegistry("get_workspace_roots_config"))!;
  },
  syncRoots: async (): Promise<WorkspaceSyncSummary> => {
    return (await invokeWorkspaceRegistry("sync_workspace_roots"))!;
  },
  checkPathExists: async (workspacePath: string): Promise<boolean | null> => {
    return (await invokeWorkspaceRegistry("check_workspace_path_exist", {
      workspacePath: normalizeWorkspacePath(workspacePath),
    }))!;
  },
  checkPathLegal: async (workspacePath: string): Promise<boolean | null> => {
    return (await invokeWorkspaceRegistry("check_workspace_path_legal", {
      workspacePath: normalizeWorkspacePath(workspacePath),
    }))!;
  },
};
