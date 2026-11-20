import { useEffect, useSyncExternalStore } from "react";

import { fontRuntimes } from "@/stores/font_store";

import { useUiPreferences } from "./use_ui_preferences";

export function useUiFontRuntime() {
  const { preferences, isLoaded } = useUiPreferences();
  const selection = preferences.appearance.font;
  const state = useSyncExternalStore(fontRuntimes.ui.subscribe, fontRuntimes.ui.getSnapshot);
  useEffect(() => {
    if (isLoaded) void fontRuntimes.ui.observe(selection);
  }, [isLoaded, selection]);
  return state;
}
