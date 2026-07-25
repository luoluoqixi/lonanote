import { useUiPreferences } from "@/hooks/settings";
import type { AppLayoutMode } from "@/stores/ui";

export function useLayoutMode() {
  const { error, isLoaded, isLoading, preferences, updateAndSave } = useUiPreferences();

  const setLayoutMode = async (layoutMode: AppLayoutMode) => {
    return updateAndSave((currentPreferences) => ({
      ...currentPreferences,
      shell: {
        ...currentPreferences.shell,
        layoutMode,
      },
    }));
  };

  return {
    error,
    isLoaded,
    isLoading,
    layoutMode: preferences.shell.layoutMode,
    setLayoutMode,
  };
}
