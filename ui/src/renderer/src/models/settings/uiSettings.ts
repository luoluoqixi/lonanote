import { accentColors } from '@radix-ui/themes/props';
import { create } from 'zustand';

import { globalLocalStorage } from '@/utils/storage';

export interface Size {
  width: number;
  height: number;
}
export type ThemeColorType = (typeof accentColors)[number];
export interface UISettingsStore {
  themeColor: ThemeColorType;
  zoom: number | undefined;
  windowSize: Size | undefined;
}

export const themeColors = accentColors;

const uiSettingsKey = 'ui-settings';
export const defaultThemeColor: ThemeColorType = 'indigo';

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
