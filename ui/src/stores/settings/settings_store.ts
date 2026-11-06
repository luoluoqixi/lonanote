import { createStore } from "zustand/vanilla";

import {
  type GlobalSettings,
  type GlobalSettingsSnapshot,
  type SettingsPatchPayload,
  createDefaultGlobalSettings,
  diffSettings,
  fromSettingsPayload,
  settings,
  toSettingsPayload,
} from "@/api/commands/settings";
import {
  type ConfigSyncState,
  applySnapshot,
  beginMutation,
  createConfigSyncState,
  rejectMutation,
  resolveMutation,
} from "@/api/common/config_sync_state";

type GlobalSettingsUpdater = GlobalSettings | ((current: GlobalSettings) => GlobalSettings);
type SettingsValues = ReturnType<typeof toSettingsPayload>;

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

let syncState: ConfigSyncState<SettingsValues> = createConfigSyncState<SettingsValues>();
let mutationSequence = 0;
let mutationQueue: Promise<void> = Promise.resolve();

const settingsStoreApi = createStore<GlobalSettingsStoreState>()((set, get) => ({
  settings: createDefaultGlobalSettings(),
  isLoaded: false,
  isLoading: false,
  error: null,
  setSettings: (nextSettings) => {
    set((state) => (state.settings === nextSettings ? state : { settings: nextSettings }));
  },
  patchSettings: (updater) => {
    const nextSettings = resolveSettingsUpdater(get().settings, updater);
    set((state) => (state.settings === nextSettings ? state : { settings: nextSettings }));
    return nextSettings;
  },
  setLoading: (isLoading) => {
    set((state) => (state.isLoading === isLoading ? state : { isLoading }));
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
    set((state) => (state.error === error ? state : { error }));
  },
}));

export function applyGlobalSettingsSnapshot(snapshot: GlobalSettingsSnapshot): void {
  syncState = applySnapshot(syncState, {
    runtimeId: snapshot.runtimeId,
    revision: snapshot.revision,
    values: toSettingsPayload(snapshot.values),
  });
  settingsStoreApi.getState().setLoadedSettings(fromSettingsPayload(syncState.values));
}

async function commitPatch(patch: SettingsPatchPayload): Promise<GlobalSettings> {
  if (Object.keys(patch).length === 0) {
    return settingsStoreApi.getState().settings;
  }

  const mutationId = `settings-${++mutationSequence}`;
  syncState = beginMutation(syncState, mutationId, { set: patch });
  settingsStoreApi.getState().setSettings(fromSettingsPayload(syncState.values));
  settingsStoreApi.getState().setError(null);

  const request = mutationQueue.then(async () => {
    const snapshot = await settings.patchAndSave(patch);
    syncState = resolveMutation(syncState, mutationId, {
      runtimeId: snapshot.runtimeId,
      revision: snapshot.revision,
      values: toSettingsPayload(snapshot.values),
    });
    const nextSettings = fromSettingsPayload(syncState.values);
    settingsStoreApi.getState().setLoadedSettings(nextSettings);
    return nextSettings;
  });
  mutationQueue = request.then(
    () => undefined,
    () => undefined,
  );

  try {
    return await request;
  } catch (error) {
    syncState = rejectMutation(syncState, mutationId);
    settingsStoreApi.getState().setSettings(fromSettingsPayload(syncState.values));
    settingsStoreApi.getState().setError(toErrorMessage(error));
    throw error;
  }
}

export const settingsStore = {
  store: settingsStoreApi,
  subscribe: settingsStoreApi.subscribe,
  getSnapshot: (): GlobalSettingsStoreState => settingsStoreApi.getState(),
  getSettings: (): GlobalSettings => settingsStoreApi.getState().settings,
  setSettings: (nextSettings: GlobalSettings): void => {
    settingsStoreApi.getState().setSettings(nextSettings);
  },
  patchSettings: (updater: GlobalSettingsUpdater): GlobalSettings => {
    return settingsStoreApi.getState().patchSettings(updater);
  },
  applySnapshot: applyGlobalSettingsSnapshot,
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
      const snapshot = await settings.snapshot();
      applyGlobalSettingsSnapshot(snapshot);
      return settingsStoreApi.getState().settings;
    } catch (error) {
      settingsStoreApi.getState().setLoading(false);
      settingsStoreApi.getState().setError(toErrorMessage(error));
      throw error;
    }
  },
  refresh: async (): Promise<GlobalSettings> => settingsStore.load(true),
  save: async (): Promise<GlobalSettings> => {
    if (!syncState.committed) {
      await settingsStore.load();
    }
    const currentSettings = settingsStoreApi.getState().settings;
    const committedSettings = fromSettingsPayload(syncState.committed?.values ?? {});
    return commitPatch(diffSettings(committedSettings, currentSettings));
  },
  updateAndSave: async (updater: GlobalSettingsUpdater): Promise<GlobalSettings> => {
    if (!syncState.committed) {
      await settingsStore.load();
    }
    const previousSettings = settingsStoreApi.getState().settings;
    const nextSettings = settingsStoreApi.getState().patchSettings(updater);
    return commitPatch(diffSettings(previousSettings, nextSettings));
  },
};
