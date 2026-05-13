import { createStore } from "zustand/vanilla";

import {
  type DesktopWindowState,
  type UiPreferences,
  createDefaultUiPreferences,
  uiPreferences,
} from "@/api/commands/store/ui_preferences";

type UiPreferencesUpdater = UiPreferences | ((current: UiPreferences) => UiPreferences);

export type UiPreferencesStoreState = {
  preferences: UiPreferences;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  setPreferences: (nextPreferences: UiPreferences) => void;
  patchPreferences: (updater: UiPreferencesUpdater) => UiPreferences;
  setLoading: (isLoading: boolean) => void;
  setLoadedPreferences: (nextPreferences: UiPreferences) => void;
  setError: (error: string | null) => void;
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function resolvePreferencesUpdater(
  currentPreferences: UiPreferences,
  updater: UiPreferencesUpdater,
): UiPreferences {
  return typeof updater === "function" ? updater(currentPreferences) : updater;
}

const uiPreferencesStoreApi = createStore<UiPreferencesStoreState>()((set, get) => ({
  preferences: createDefaultUiPreferences(),
  isLoaded: false,
  isLoading: false,
  error: null,
  setPreferences: (nextPreferences) => {
    set((state) => {
      if (state.preferences === nextPreferences) {
        return state;
      }

      return {
        preferences: nextPreferences,
      };
    });
  },
  patchPreferences: (updater) => {
    const nextPreferences = resolvePreferencesUpdater(get().preferences, updater);

    set((state) => {
      if (state.preferences === nextPreferences) {
        return state;
      }

      return {
        preferences: nextPreferences,
      };
    });

    return nextPreferences;
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
  setLoadedPreferences: (nextPreferences) => {
    set((state) => ({
      preferences: nextPreferences,
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

export const uiPreferencesStore = {
  store: uiPreferencesStoreApi,
  subscribe: uiPreferencesStoreApi.subscribe,
  getSnapshot: (): UiPreferencesStoreState => {
    return uiPreferencesStoreApi.getState();
  },
  getPreferences: (): UiPreferences => {
    return uiPreferencesStoreApi.getState().preferences;
  },
  setPreferences: (nextPreferences: UiPreferences): void => {
    uiPreferencesStoreApi.getState().setPreferences(nextPreferences);
  },
  setDesktopWindowState: (nextWindowState: DesktopWindowState | null): void => {
    uiPreferencesStoreApi.getState().patchPreferences((currentPreferences) => ({
      ...currentPreferences,
      window: {
        ...currentPreferences.window,
        lastWindowState: nextWindowState,
      },
    }));
  },
  patchPreferences: (updater: UiPreferencesUpdater): UiPreferences => {
    return uiPreferencesStoreApi.getState().patchPreferences(updater);
  },
  load: async (force = false): Promise<UiPreferences> => {
    const state = uiPreferencesStoreApi.getState();

    if (state.isLoading) {
      return state.preferences;
    }

    if (state.isLoaded && !force) {
      return state.preferences;
    }

    state.setLoading(true);
    state.setError(null);

    try {
      const nextPreferences = await uiPreferences.getPreferences();
      uiPreferencesStoreApi.getState().setLoadedPreferences(nextPreferences);
      return nextPreferences;
    } catch (error) {
      uiPreferencesStoreApi.getState().setLoading(false);
      uiPreferencesStoreApi.getState().setError(toErrorMessage(error));
      throw error;
    }
  },
  refresh: async (): Promise<UiPreferences> => {
    return uiPreferencesStore.load(true);
  },
  save: async (): Promise<UiPreferences> => {
    const currentPreferences = uiPreferencesStoreApi.getState().preferences;
    uiPreferencesStoreApi.getState().setError(null);

    try {
      const savedPreferences = await uiPreferences.savePreferences(currentPreferences);
      uiPreferencesStoreApi.getState().setLoadedPreferences(savedPreferences);
      return savedPreferences;
    } catch (error) {
      uiPreferencesStoreApi.getState().setError(toErrorMessage(error));
      throw error;
    }
  },
  updateAndSave: async (updater: UiPreferencesUpdater): Promise<UiPreferences> => {
    const previousPreferences = uiPreferencesStoreApi.getState().preferences;
    const nextPreferences = uiPreferencesStoreApi.getState().patchPreferences(updater);
    uiPreferencesStoreApi.getState().setError(null);

    try {
      const savedPreferences = await uiPreferences.savePreferences(nextPreferences);
      uiPreferencesStoreApi.getState().setLoadedPreferences(savedPreferences);
      return savedPreferences;
    } catch (error) {
      uiPreferencesStoreApi.getState().setPreferences(previousPreferences);
      uiPreferencesStoreApi.getState().setError(toErrorMessage(error));
      throw error;
    }
  },
};
