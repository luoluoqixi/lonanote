import { create } from 'zustand';

import { globalLocalStorage } from '@/utils/storage';

export interface Size {
  width: number;
  height: number;
}
export interface UISettingsStore {
  themeColor: string;
  zoom: number | undefined;
  windowSize: Size | undefined;
}

const uiSettingsKey = 'ui-settings';
export const defaultThemeColor = '#f57cc8';

const initUISettings: UISettingsStore = (() => {
  const s = globalLocalStorage.get(uiSettingsKey);
  return (
    s ||
    ({
      themeColor: defaultThemeColor,
      zoom: undefined,
      windowSize: undefined,
    } as UISettingsStore)
  );
})();

export const saveUISettings = (settings: UISettingsStore) => {
  globalLocalStorage.set(uiSettingsKey, settings);
};

export const useUISettingsStore = create<UISettingsStore>(() => initUISettings);
