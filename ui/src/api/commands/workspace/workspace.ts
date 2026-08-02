import { invokeWorkspaceResult, invokeWorkspaceUnit } from "./invoke_workspace";
import type {
  AttachWorkspaceResult,
  ExternalWorkspaceStorageBindingRequest,
  RelocateWorkspaceResult,
  RemoveWorkspaceResult,
  StorageProviderId,
  WorkspaceId,
  WorkspaceListItem,
  WorkspaceLocalSetting,
  WorkspaceRelativePath,
  WorkspaceSettings,
  WorkspaceSnapshot,
  WorkspaceStorageTarget,
} from "./types";

export const workspace = {
  list: (): Promise<WorkspaceListItem[]> => {
    return invokeWorkspaceResult("workspace.list");
  },

  listStorageProviderIds: (): Promise<StorageProviderId[]> => {
    return invokeWorkspaceResult("workspace.list_storage_provider_ids");
  },

  listManagedStorageProviderIds: (): Promise<StorageProviderId[]> => {
    return invokeWorkspaceResult("workspace.list_managed_storage_provider_ids");
  },

  get: (workspaceId: WorkspaceId): Promise<WorkspaceSnapshot> => {
    return invokeWorkspaceResult("workspace.get", { workspaceId });
  },

  isOpen: (workspaceId: WorkspaceId): Promise<boolean> => {
    return invokeWorkspaceResult("workspace.is_open", { workspaceId });
  },

  createManaged: (
    providerId: StorageProviderId,
    displayName: string,
  ): Promise<WorkspaceSnapshot> => {
    return invokeWorkspaceResult("workspace.create_managed", { providerId, displayName });
  },

  createExternal: (
    binding: ExternalWorkspaceStorageBindingRequest,
    displayName: string,
  ): Promise<WorkspaceSnapshot> => {
    return invokeWorkspaceResult("workspace.create_external", { binding, displayName });
  },

  attach: (binding: ExternalWorkspaceStorageBindingRequest): Promise<AttachWorkspaceResult> => {
    return invokeWorkspaceResult("workspace.attach", { binding });
  },

  open: (workspaceId: WorkspaceId): Promise<WorkspaceSnapshot> => {
    return invokeWorkspaceResult("workspace.open", { workspaceId });
  },

  close: (workspaceId: WorkspaceId): Promise<void> => {
    return invokeWorkspaceUnit("workspace.close", { workspaceId });
  },

  remove: (workspaceId: WorkspaceId, deleteFiles = false): Promise<RemoveWorkspaceResult> => {
    return invokeWorkspaceResult("workspace.remove", { workspaceId, deleteFiles });
  },

  relocate: (
    workspaceId: WorkspaceId,
    target: WorkspaceStorageTarget,
  ): Promise<RelocateWorkspaceResult> => {
    return invokeWorkspaceResult("workspace.relocate", { workspaceId, target });
  },

  updateDisplayName: (
    workspaceId: WorkspaceId,
    displayName: string,
  ): Promise<WorkspaceSnapshot> => {
    return invokeWorkspaceResult("workspace.update_display_name", { workspaceId, displayName });
  },

  getSettings: (workspaceId: WorkspaceId): Promise<WorkspaceSettings> => {
    return invokeWorkspaceResult("workspace.get_settings", { workspaceId });
  },

  setSettings: (
    workspaceId: WorkspaceId,
    settings: WorkspaceSettings,
  ): Promise<WorkspaceSettings> => {
    return invokeWorkspaceResult("workspace.set_settings", { workspaceId, settings });
  },

  getLastWorkspaceId: (): Promise<WorkspaceId | null> => {
    return invokeWorkspaceResult("workspace.get_last_workspace_id");
  },

  getLocalSetting: (workspaceId: WorkspaceId): Promise<WorkspaceLocalSetting> => {
    return invokeWorkspaceResult("workspace.get_local_setting", { workspaceId });
  },

  setLastOpenFile: (
    workspaceId: WorkspaceId,
    path: WorkspaceRelativePath | null,
  ): Promise<WorkspaceLocalSetting> => {
    return invokeWorkspaceResult("workspace.set_last_open_file", { workspaceId, path });
  },
};
