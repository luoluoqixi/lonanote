import { invokeAsync } from '@/bindings/core';

export interface Settings {
  autoUpdate: boolean;
  autoOpenLastWorkspace: boolean;
}

export const settings = {
  getSettings: async (): Promise<Settings> => {
    return (await invokeAsync('get_settings'))!;
  },
  saveSettings: async (): Promise<void> => {
    return (await invokeAsync('save_settings'))!;
  },
};
