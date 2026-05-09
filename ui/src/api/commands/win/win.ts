import { invoke } from "@/api/invoke";

export const win = {
  setBgColor: async (color: string): Promise<boolean> => {
    return (await invoke("win.set_bg_color", { color }))!;
  },
  setWindowBgColor: async (label: string, color: string): Promise<boolean> => {
    return (await invoke("win.set_window_bg_color", { label, color }))!;
  },
};
