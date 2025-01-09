import { invokeAsync } from '@/bindings/core';

export interface Settings {
  autoCheckUpdate: boolean;
  autoOpenLastWorkspace: boolean;
}

export const settings = {
  getSettings: async (): Promise<Settings> => {
    return (await invokeAsync('get_settings'))!;
  },
  setSettings: async (settings: Settings) => {
    return (await invokeAsync('set_settings', settings))!;
  },
  setSettingsAndSave: async (settings: Settings) => {
    return (await invokeAsync('set_settings_and_save', settings))!;
  },
  saveSettings: async (): Promise<void> => {
    return (await invokeAsync('save_settings'))!;
  },
};
