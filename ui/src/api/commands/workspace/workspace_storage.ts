import { invoke } from "@/api/invoke";

import type {
  ScanStorageMountRequest,
  ScanStorageMountResult,
  StorageMountKind,
  StorageMountRecord,
  StorageMountStatus,
} from "./types";

const invokeWorkspaceStorage = <T = unknown>(
  command: string,
  args?: object,
): Promise<T | undefined> => {
  return invoke<T>(`workspace.storage.${command}`, args);
};

/**
 * picker 不属于这个 API。平台层获得 absolute path、bookmark ref 或 grant ref 后，
 * 再通过这里注册或恢复 mount。
 */
export const workspaceStorage = {
  registerMount: async (mount: StorageMountRecord): Promise<void> => {
    await invokeWorkspaceStorage("register_mount", mount);
  },
  reauthorizeMount: async (
    mountId: string,
    kind: StorageMountKind,
  ): Promise<StorageMountRecord> => {
    return (await invokeWorkspaceStorage("reauthorize_mount", { mountId, kind }))!;
  },
  removeMount: async (mountId: string): Promise<void> => {
    await invokeWorkspaceStorage("remove_mount", { mountId });
  },
  listMounts: async (): Promise<StorageMountRecord[]> => {
    return (await invokeWorkspaceStorage("list_mounts"))!;
  },
  getMountStatus: async (mountId: string): Promise<StorageMountStatus> => {
    return (await invokeWorkspaceStorage("get_mount_status", { mountId }))!;
  },
  listMountStatuses: async (): Promise<StorageMountStatus[]> => {
    return (await invokeWorkspaceStorage("list_mount_statuses"))!;
  },
  /**
   * 只扫描显式 parent 的直接子目录；结果不会自动注册或初始化 Workspace。
   */
  scanMount: async (request: ScanStorageMountRequest): Promise<ScanStorageMountResult> => {
    return (await invokeWorkspaceStorage("scan_mount", request))!;
  },
};
