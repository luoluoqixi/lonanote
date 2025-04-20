import { invokeAsync } from '@/bindings/core';

export interface Settings {
  autoCheckUpdate: boolean;
  autoOpenLastWorkspace: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
}

export const settings = {
  getSettings: async (): Promise<Settings> => {
    return (await invokeAsync('settings.get_settings'))!;
  },
  setSettings: async (settings: Settings) => {
    return (await invokeAsync('settings.set_settings', settings))!;
  },
  setSettingsAndSave: async (settings: Settings) => {
    return (await invokeAsync('settings.set_settings_and_save', settings))!;
  },
  saveSettings: async (): Promise<void> => {
    return (await invokeAsync('settings.save_settings'))!;
  },
  resetSettingsAutoSaveInterval: async () => {
    return (await invokeAsync('settings.reset_settings_auto_save_interval', settings))!;
  },
};
