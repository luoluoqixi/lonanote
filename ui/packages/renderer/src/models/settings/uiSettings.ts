import { accentColors } from '@radix-ui/themes/props';
import { create } from 'zustand';

import { utils } from '@/utils';
import { globalLocalStorage } from '@/utils/storage';

export interface Size {
  width: number;
  height: number;
}
export type ThemeColorType = (typeof accentColors)[number];

export type UIPlatform = 'desktop' | 'mobile';
export interface UISettingsStore {
  themeColor: ThemeColorType;
  zoom: number | undefined;
  windowSize: Size | undefined;
  uiPlatform: UIPlatform | undefined;
}

export const themeColors = accentColors;

const uiSettingsKey = 'ui-settings';
export const defaultThemeColor: ThemeColorType = 'indigo';

export const defaultUIPlatform: UIPlatform = utils.isMobile() ? 'mobile' : 'desktop';

const initUISettings: UISettingsStore = (() => {
  const s = globalLocalStorage.get(uiSettingsKey);
  return (
    s ||
    ({
      themeColor: defaultThemeColor,
      uiPlatform: defaultUIPlatform,
      zoom: undefined,
      windowSize: undefined,
    } as UISettingsStore)
  );
})();

export const saveUISettings = (settings: UISettingsStore) => {
  globalLocalStorage.set(uiSettingsKey, settings);
};

export const useUISettingsStore = create<UISettingsStore>(() => initUISettings);
