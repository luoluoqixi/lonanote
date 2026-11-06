import { isDesktop, isTauri } from "@/api/common/platform";

export type WindowBootstrap = {
  currentWorkspaceId: string | null;
  restoreLastWorkspace: boolean;
};

export const multiWindow = {
  async createWindow(): Promise<string> {
    if (!isTauri() || !isDesktop()) throw new Error("当前平台不支持新建桌面窗口");
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("create_workspace_window");
  },
  async getBootstrap(): Promise<WindowBootstrap> {
    if (!isTauri() || !isDesktop()) {
      return { currentWorkspaceId: null, restoreLastWorkspace: true };
    }
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<WindowBootstrap>("get_window_bootstrap");
  },
};
