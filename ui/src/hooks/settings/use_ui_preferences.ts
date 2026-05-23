import { useStore } from "zustand";

import { uiPreferencesStore } from "@/stores/ui";

export function useUiPreferences() {
  const preferences = useStore(uiPreferencesStore.store, (state) => state.preferences);
  const isLoaded = useStore(uiPreferencesStore.store, (state) => state.isLoaded);
  const isLoading = useStore(uiPreferencesStore.store, (state) => state.isLoading);
  const error = useStore(uiPreferencesStore.store, (state) => state.error);

  return {
    preferences,
    isLoaded,
    isLoading,
    error,
    reload: uiPreferencesStore.refresh,
    save: uiPreferencesStore.save,
    setPreferences: uiPreferencesStore.setPreferences,
    patchPreferences: uiPreferencesStore.patchPreferences,
    updateAndSave: uiPreferencesStore.updateAndSave,
  };
}
