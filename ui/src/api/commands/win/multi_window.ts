import { isDesktop, isTauri } from "@/api/common/platform";

export type WindowStartCause = "initialLaunch" | "newWindow";

export const multiWindow = {
  async createWindow(): Promise<string> {
    if (!isTauri() || !isDesktop()) throw new Error("当前平台不支持新建桌面窗口");
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("create_workspace_window");
  },
  async getBootstrap(): Promise<WindowStartCause> {
    if (!isTauri() || !isDesktop()) return "initialLaunch";
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<WindowStartCause>("get_window_bootstrap");
  },
};
