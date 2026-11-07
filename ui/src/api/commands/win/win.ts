import { isDesktop, isTauri } from "@/api/common/platform";
import { invoke } from "@/api/invoke";

export const win = {
  setCurrentWindowBgColor: async (color: string): Promise<boolean> => {
    if (!isDesktop() || !isTauri()) return false;
    const { invoke: invokeDesktop } = await import("@tauri-apps/api/core");
    return invokeDesktop<boolean>("set_current_window_background", { color });
  },
  setBgColor: async (color: string): Promise<boolean> => {
    return (await invoke("win.set_bg_color", { color }))!;
  },
  setWindowBgColor: async (label: string, color: string): Promise<boolean> => {
    return (await invoke("win.set_window_bg_color", { label, color }))!;
  },
};
