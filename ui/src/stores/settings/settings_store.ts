import { createStore } from "zustand/vanilla";

import {
  type GlobalSettings,
  createDefaultGlobalSettings,
  settings,
} from "@/api/commands/settings";

type GlobalSettingsUpdater = GlobalSettings | ((current: GlobalSettings) => GlobalSettings);

export type GlobalSettingsStoreState = {
  settings: GlobalSettings;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  setSettings: (nextSettings: GlobalSettings) => void;
  patchSettings: (updater: GlobalSettingsUpdater) => GlobalSettings;
  setLoading: (isLoading: boolean) => void;
  setLoadedSettings: (nextSettings: GlobalSettings) => void;
  setError: (error: string | null) => void;
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function resolveSettingsUpdater(
  currentSettings: GlobalSettings,
  updater: GlobalSettingsUpdater,
): GlobalSettings {
  return typeof updater === "function" ? updater(currentSettings) : updater;
}

const settingsStoreApi = createStore<GlobalSettingsStoreState>()((set, get) => ({
  settings: createDefaultGlobalSettings(),
  isLoaded: false,
  isLoading: false,
  error: null,
  setSettings: (nextSettings) => {
    set((state) => {
      if (state.settings === nextSettings) {
        return state;
      }

      return {
        settings: nextSettings,
      };
    });
  },
  patchSettings: (updater) => {
    const nextSettings = resolveSettingsUpdater(get().settings, updater);

    set((state) => {
      if (state.settings === nextSettings) {
        return state;
      }

      return {
        settings: nextSettings,
      };
    });

    return nextSettings;
  },
  setLoading: (isLoading) => {
    set((state) => {
      if (state.isLoading === isLoading) {
        return state;
      }

      return {
        isLoading,
      };
    });
  },
  setLoadedSettings: (nextSettings) => {
    set((state) => ({
      settings: nextSettings,
      isLoaded: true,
      isLoading: false,
      error: state.error,
    }));
  },
  setError: (error) => {
    set((state) => {
      if (state.error === error) {
        return state;
      }

      return {
        error,
      };
    });
  },
}));

export const settingsStore = {
  store: settingsStoreApi,
  subscribe: settingsStoreApi.subscribe,
  getSnapshot: (): GlobalSettingsStoreState => {
    return settingsStoreApi.getState();
  },
  getSettings: (): GlobalSettings => {
    return settingsStoreApi.getState().settings;
  },
  setSettings: (nextSettings: GlobalSettings): void => {
    settingsStoreApi.getState().setSettings(nextSettings);
  },
  patchSettings: (updater: GlobalSettingsUpdater): GlobalSettings => {
    return settingsStoreApi.getState().patchSettings(updater);
  },
  load: async (force = false): Promise<GlobalSettings> => {
    const state = settingsStoreApi.getState();

    if (state.isLoading) {
      return state.settings;
    }

    if (state.isLoaded && !force) {
      return state.settings;
    }

    state.setLoading(true);
    state.setError(null);

    try {
      const nextSettings = await settings.getSettings();
      settingsStoreApi.getState().setLoadedSettings(nextSettings);
      return nextSettings;
    } catch (error) {
      settingsStoreApi.getState().setLoading(false);
      settingsStoreApi.getState().setError(toErrorMessage(error));
      throw error;
    }
  },
  refresh: async (): Promise<GlobalSettings> => {
    return settingsStore.load(true);
  },
  save: async (): Promise<GlobalSettings> => {
    const currentSettings = settingsStoreApi.getState().settings;
    settingsStoreApi.getState().setError(null);

    try {
      const savedSettings = await settings.setSettingsAndSave(currentSettings);
      settingsStoreApi.getState().setLoadedSettings(savedSettings);
      return savedSettings;
    } catch (error) {
      settingsStoreApi.getState().setError(toErrorMessage(error));
      throw error;
    }
  },
  updateAndSave: async (updater: GlobalSettingsUpdater): Promise<GlobalSettings> => {
    const previousSettings = settingsStoreApi.getState().settings;
    const nextSettings = settingsStoreApi.getState().patchSettings(updater);
    settingsStoreApi.getState().setError(null);

    try {
      const savedSettings = await settings.setSettingsAndSave(nextSettings);
      settingsStoreApi.getState().setLoadedSettings(savedSettings);
      return savedSettings;
    } catch (error) {
      settingsStoreApi.getState().setSettings(previousSettings);
      settingsStoreApi.getState().setError(toErrorMessage(error));
      throw error;
    }
  },
};
