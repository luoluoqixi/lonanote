import { invoke } from "@/api/invoke";

export interface Settings {
  autoCheckUpdate: boolean;
  autoOpenLastWorkspace: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  autoSaveFocusChange: boolean;
  showLineNumber: boolean;
  disableLineWrap: boolean;
}

export const settings = {
  getSettings: async (): Promise<Settings> => {
    return (await invoke("settings.get_settings"))!;
  },
  setSettings: async (settings: Settings) => {
    return (await invoke("settings.set_settings", settings))!;
  },
  setSettingsAndSave: async (settings: Settings) => {
    return (await invoke("settings.set_settings_and_save", settings))!;
  },
  saveSettings: async (): Promise<void> => {
    return (await invoke("settings.save_settings"))!;
  },
  resetSettingsAutoSaveInterval: async () => {
    return (await invoke("settings.reset_settings_auto_save_interval"))!;
  },
};
