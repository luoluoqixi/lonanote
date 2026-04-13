import { Settings, settings } from '@/bindings/api';
import { useSettingsStore } from '@/models/settings';

export const useSettings = useSettingsStore;

export const setSettings = async (s: Settings) => {
  useSettingsStore.setState((state) => ({ ...state, settings: s }));
  await settings.setSettingsAndSave(s);
};

const getSettings = () => {
  const oldSettings = useSettingsStore.getState().settings;
  if (!oldSettings) {
    console.warn('setSettingsAutoUpdate error: settings is undefined');
  }
  return oldSettings;
};

const setSettingsCallback = async (set: (state: Settings) => void) => {
  const oldSettings = getSettings();
  if (!oldSettings) return;
  const settings = { ...oldSettings };
  set(settings);
  setSettings(settings);
};

export const setSettingsAutoCheckUpdate = async (autoCheckUpdate: boolean) => {
  setSettingsCallback((s) => {
    s.autoCheckUpdate = autoCheckUpdate;
  });
};

export const setSettingsAutoOpenLastWorkspace = async (autoOpenLastWorkspace: boolean) => {
  setSettingsCallback((s) => {
    s.autoOpenLastWorkspace = autoOpenLastWorkspace;
  });
};

export const setSettingsAutoSave = async (autoSave: boolean) => {
  setSettingsCallback((s) => {
    s.autoSave = autoSave;
  });
};

export const setSettingsAutoSaveInterval = async (autoSaveInterval: number) => {
  setSettingsCallback((s) => {
    s.autoSaveInterval = autoSaveInterval;
  });
};

export const setSettingsAutoSaveFocusChange = async (autoSaveFocusChange: boolean) => {
  setSettingsCallback((s) => {
    s.autoSaveFocusChange = autoSaveFocusChange;
  });
};

export const setSettingsShowLineNumber = async (showLineNumber: boolean) => {
  setSettingsCallback((s) => {
    s.showLineNumber = showLineNumber;
  });
};

export const setSettingsDisableLineWrap = async (disableLineWrap: boolean) => {
  setSettingsCallback((s) => {
    s.disableLineWrap = disableLineWrap;
  });
};

export const resetSettingsAutoSaveInterval = async () => {
  await settings.resetSettingsAutoSaveInterval();
  const ss = await settings.getSettings();
  useSettingsStore.setState((s) => ({ ...s, settings: ss }));
};

export const initGlobalSettings = async () => {
  const ss = await settings.getSettings();
  useSettingsStore.setState((s) => ({ ...s, settings: ss }));
};
