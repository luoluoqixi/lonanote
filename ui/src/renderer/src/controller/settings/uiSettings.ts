import {
  Size,
  defaultThemeColor,
  saveUISettings,
  useUISettingsStore,
} from '@/models/settings/uiSettings';

export const useUISettings = useUISettingsStore;
export { defaultThemeColor };

export const getThemeColor = () => {
  return useUISettingsStore.getState().themeColor;
};

export const setThemeColor = (themeColor: string) => {
  useUISettingsStore.setState((s) => {
    const newState = { ...s, themeColor };
    saveUISettings(newState);
    return newState;
  });
};

export const setZoom = async (zoom: number) => {
  if (!window.api) return;
  await window.api.utils.setZoom(zoom);
  useUISettingsStore.setState((s) => {
    const newState = { ...s, zoom };
    saveUISettings(newState);
    return newState;
  });
};

const onZoomChange = (zoom: number) => {
  useUISettingsStore.setState((s) => ({ ...s, zoom }));
};
const onWindowSizeChange = (windowSize: Size) => {
  useUISettingsStore.setState((s) => ({ ...s, windowSize }));
};

export const isSupportZoom = (): boolean => {
  return window.api != null;
};

export const isSupportResizeWindow = () => {
  return window.api != null;
};

export const resetWindowSize = async () => {
  if (window.api) {
    await window.api.utils.resetWindowSize();
  }
};

export const initUISettings = async () => {
  if (window.api) {
    const zoom = await window.api.utils.getZoom();
    window.api.utils.removeZoomChangeListener(onZoomChange);
    window.api.utils.addZoomChangeListener(onZoomChange);

    const windowSize = await window.api.utils.getWindowSize();
    window.api.utils.removeWindowSizeChangeListener(onWindowSizeChange);
    window.api.utils.addWindowSizeChangeListener(onWindowSizeChange);

    useUISettingsStore.setState((s) => ({ ...s, zoom, windowSize }));
  }
};
