import { useEffect } from "react";
import { useStore } from "zustand";

import { settingsStore } from "@/stores/settings";

export function useGlobalSettings() {
  const settings = useStore(settingsStore.store, (state) => state.settings);
  const isLoaded = useStore(settingsStore.store, (state) => state.isLoaded);
  const isLoading = useStore(settingsStore.store, (state) => state.isLoading);
  const error = useStore(settingsStore.store, (state) => state.error);

  useEffect(() => {
    if (!isLoaded && !isLoading) {
      void settingsStore.load();
    }
  }, [isLoaded, isLoading]);

  return {
    settings,
    isLoaded,
    isLoading,
    error,
    reload: settingsStore.refresh,
    save: settingsStore.save,
    setSettings: settingsStore.setSettings,
    patchSettings: settingsStore.patchSettings,
    updateAndSave: settingsStore.updateAndSave,
  };
}
