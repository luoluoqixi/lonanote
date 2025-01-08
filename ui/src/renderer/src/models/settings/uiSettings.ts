import { create } from 'zustand';

import { globalLocalStorage } from '@/utils/storage';

export interface Size {
  width: number;
  height: number;
}

export interface UISettingsData {
  themeColor: string;
  zoom: number | undefined;
  windowSize: Size | undefined;
}

export interface UISettingsStore extends UISettingsData {
  setThemeColor: (themeColor: string) => void;
  setZoom: (zoom: number) => void;
  setWindowSize: (size: Size) => void;
}

const uiSettingsKey = 'ui-settings';

export const defaultThemeColor = '#f57cc8';

const initUISettings: UISettingsData = (() => {
  const s = globalLocalStorage.get(uiSettingsKey);
  return (
    s ||
    ({
      themeColor: defaultThemeColor,
      zoom: undefined,
      windowSize: undefined,
    } as UISettingsData)
  );
})();

const saveUISettings = (settings: UISettingsStore) => {
  globalLocalStorage.set(uiSettingsKey, settings);
};

export const useUISettingsStore = create<UISettingsStore>((set) => ({
  ...initUISettings,
  setThemeColor: (themeColor) => {
    set((s) => {
      const settings: UISettingsStore = {
        ...s,
        themeColor,
      };
      saveUISettings(settings);
      return settings;
    });
  },
  setZoom: (zoom) => {
    set((s) => {
      const settings: UISettingsStore = {
        ...s,
        zoom,
      };
      saveUISettings(settings);
      return settings;
    });
  },
  setWindowSize: (size) => {
    set((s) => {
      const settings: UISettingsStore = {
        ...s,
        windowSize: size,
      };
      saveUISettings(settings);
      return settings;
    });
  },
}));

export const getThemeColor = () => {
  return useUISettingsStore.getState().themeColor;
};

const onZoomChange = (zoom: number) => {
  useUISettingsStore.getState().setZoom(zoom);
};
const onWindowSizeChange = (size: Size) => {
  useUISettingsStore.getState().setWindowSize(size);
};

export const initUISettingsModel = async () => {
  if (window.api) {
    const zoom = await window.api.utils.getZoom();
    useUISettingsStore.getState().setZoom(zoom);
    window.api.utils.removeZoomChangeListener(onZoomChange);
    window.api.utils.addZoomChangeListener(onZoomChange);

    const windowSize = await window.api.utils.getWindowSize();
    useUISettingsStore.getState().setWindowSize(windowSize);
    window.api.utils.removeWindowSizeChangeListener(onWindowSizeChange);
    window.api.utils.addWindowSizeChangeListener(onWindowSizeChange);
  }
};

export const isSupportZoom = (): boolean => {
  return window.api != null;
};

export const setZoom = async (zoom: number) => {
  if (window.api) {
    await window.api.utils.setZoom(zoom);
    useUISettingsStore.getState().setZoom(zoom);
  }
};

export const isSupportResizeWindow = () => {
  return window.api != null;
};

export const resetWindowSize = async () => {
  if (window.api) {
    await window.api.utils.resetWindowSize();
  }
};
