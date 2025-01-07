import { create } from 'zustand';

import { utils } from '@/utils';
import { globalLocalStorage } from '@/utils/storage';

export interface AppearanceSettingsData {
  color: string;
}

export interface SettingsData {
  appearanceSettings?: AppearanceSettingsData;
}

export interface SettingsStore extends SettingsData {
  setAppearanceColor: (color: string) => void;
}

const settingsKey = 'settings';

const initSettings: AppearanceSettingsData = (() => {
  const settingsJson = globalLocalStorage.get(settingsKey);
  if (settingsJson) {
    return settingsJson;
  }
  return {};
})();

const saveSettings = (settings: SettingsStore) => {
  globalLocalStorage.set(settingsKey, settings);
};

export const defaultAppearanceColor = '#f57cc8';

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...initSettings,
  setAppearanceColor: (color) => {
    set((s) => {
      const settings: SettingsStore = {
        ...s,
        appearanceSettings: {
          ...s.appearanceSettings,
          color,
        },
      };
      saveSettings(settings);
      return settings;
    });
  },
}));

export const getAppearanceColor = () => {
  const color = useSettingsStore.getState().appearanceSettings?.color;
  return color || defaultAppearanceColor;
};

export const getAppearanceColorPrimaryColors = () => {
  const color = getAppearanceColor();
  return utils.generateColorShades(color);
};
