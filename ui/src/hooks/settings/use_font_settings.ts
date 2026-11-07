import { useEffect, useSyncExternalStore } from "react";

import type { FontConsumer, FontSelection } from "@/api/commands/fonts/types";
import { fontSelectionIdentity } from "@/fonts/font_selection";
import { fontRuntimes } from "@/stores/font_store";

import { useGlobalSettings } from "./use_global_settings";
import { useUiPreferences } from "./use_ui_preferences";

export function useFontSettings() {
  const global = useGlobalSettings();
  const ui = useUiPreferences();
  const uiState = useSyncExternalStore(fontRuntimes.ui.subscribe, fontRuntimes.ui.getSnapshot);
  const editorState = useSyncExternalStore(
    fontRuntimes.editor.subscribe,
    fontRuntimes.editor.getSnapshot,
  );
  const uiSelection = ui.preferences.appearance.font;
  const editorSelection = global.settings.editorDefaults.font;
  useEffect(() => {
    void fontRuntimes.ui.observe(uiSelection);
  }, [uiSelection]);
  useEffect(() => {
    if (global.isLoaded) void fontRuntimes.editor.observe(editorSelection);
  }, [editorSelection, global.isLoaded]);
  return {
    ui: uiState,
    editor: editorState,
    async select(consumer: FontConsumer, selection: FontSelection) {
      await fontRuntimes[consumer].select(
        selection === null ? null : fontSelectionIdentity(selection),
        async (font) => {
          if (consumer === "ui")
            await ui.updateAndSave((current) => ({
              ...current,
              appearance: { ...current.appearance, font },
            }));
          else
            await global.updateAndSave((current) => ({
              ...current,
              editorDefaults: { ...current.editorDefaults, font },
            }));
        },
      );
    },
  };
}
