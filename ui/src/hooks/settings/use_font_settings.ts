import { useEffect, useSyncExternalStore } from "react";

import type { FontConsumer, FontSelection } from "@/api/commands/fonts/types";
import { fontSelectionIdentity } from "@/fonts/font_selection";
import { fontRuntimes } from "@/stores/font_store";

import { useGlobalSettings } from "./use_global_settings";
import { useUiFontRuntime } from "./use_ui_font_runtime";
import { useUiPreferences } from "./use_ui_preferences";

export function useFontSettings() {
  const global = useGlobalSettings();
  const ui = useUiPreferences();
  const uiState = useUiFontRuntime();
  const editorState = useEditorFontRuntime();
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

export function useEditorFontRuntime() {
  const global = useGlobalSettings();
  const selection = global.settings.editorDefaults.font;
  const state = useSyncExternalStore(
    fontRuntimes.editor.subscribe,
    fontRuntimes.editor.getSnapshot,
  );
  useEffect(() => {
    if (global.isLoaded) void fontRuntimes.editor.observe(selection);
  }, [selection, global.isLoaded]);
  return state;
}
