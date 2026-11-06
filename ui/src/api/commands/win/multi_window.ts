import type {
  StorageCleanupStatus,
  WorkspaceStorageBindingRequest,
  WorkspaceStorageTarget,
} from "@/api/commands/workspace";
import { isDesktop, isTauri } from "@/api/common/platform";

export type StorageChangeResult = {
  wasOpen: boolean;
  reopened: boolean;
  reopenError: string | null;
  sourceCleanup: StorageCleanupStatus | null;
};

export type WindowBootstrap = {
  currentWorkspaceId: string | null;
  restoreLastWorkspace: boolean;
};

export const multiWindow = {
  async assertWorkspaceEditable(workspaceId: string): Promise<void> {
    if (!isTauri() || !isDesktop()) return;
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("assert_workspace_editable", { workspaceId });
  },
  async getCurrentWorkspaceId(): Promise<string | null> {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string | null>("get_window_workspace");
  },
  async changeStorage(
    workspaceId: string,
    change:
      | { mode: "relocate"; target: WorkspaceStorageTarget }
      | { mode: "rebind"; binding: WorkspaceStorageBindingRequest },
  ): Promise<StorageChangeResult> {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<StorageChangeResult>("change_workspace_storage", { workspaceId, change });
  },
  async createWindow(workspaceId?: string): Promise<string> {
    if (!isTauri() || !isDesktop()) throw new Error("当前平台不支持新建桌面窗口");
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("create_workspace_window", { workspaceId: workspaceId ?? null });
  },
  async getBootstrap(): Promise<WindowBootstrap> {
    if (!isTauri() || !isDesktop()) {
      return { currentWorkspaceId: null, restoreLastWorkspace: true };
    }
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<WindowBootstrap>("get_window_bootstrap");
  },
};
