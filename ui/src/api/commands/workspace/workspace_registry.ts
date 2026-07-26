import { invoke } from "@/api/invoke";

import type {
  AttachWorkspaceRequest,
  CreateWorkspaceRequest,
  MoveWorkspaceRequest,
  MoveWorkspaceResult,
  RemoveWorkspaceResult,
  WorkspaceRecord,
  WorkspaceRecordStatus,
  WorkspaceSaveData,
  WorkspaceSettings,
} from "./types";

const invokeWorkspaceRegistry = <T = unknown>(
  command: string,
  args?: object,
): Promise<T | undefined> => {
  return invoke<T>(`workspace.registry.${command}`, args);
};

export const workspaceRegistry = {
  listRecords: async (): Promise<WorkspaceRecord[]> => {
    return (await invokeWorkspaceRegistry("list_workspace_records"))!;
  },
  getRecord: async (workspaceId: string): Promise<WorkspaceRecord> => {
    return (await invokeWorkspaceRegistry("get_workspace_record", { workspaceId }))!;
  },
  getStatus: async (workspaceId: string): Promise<WorkspaceRecordStatus> => {
    return (await invokeWorkspaceRegistry("get_workspace_status", { workspaceId }))!;
  },
  listStatuses: async (): Promise<WorkspaceRecordStatus[]> => {
    return (await invokeWorkspaceRegistry("list_workspace_statuses"))!;
  },
  create: async (request: CreateWorkspaceRequest): Promise<WorkspaceRecord> => {
    return (await invokeWorkspaceRegistry("create_workspace", request))!;
  },
  attach: async (request: AttachWorkspaceRequest): Promise<WorkspaceRecord> => {
    return (await invokeWorkspaceRegistry("attach_workspace", request))!;
  },
  rename: async (workspaceId: string, newName: string): Promise<WorkspaceRecord> => {
    return (await invokeWorkspaceRegistry("rename_workspace", { workspaceId, newName }))!;
  },
  move: async (request: MoveWorkspaceRequest): Promise<MoveWorkspaceResult> => {
    return (await invokeWorkspaceRegistry("move_workspace", request))!;
  },
  remove: async (workspaceId: string, deleteFiles = false): Promise<RemoveWorkspaceResult> => {
    return (await invokeWorkspaceRegistry("remove_workspace", { workspaceId, deleteFiles }))!;
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
    await invokeWorkspaceRegistry("set_workspace_savedata", { workspaceId, data });
  },
};
