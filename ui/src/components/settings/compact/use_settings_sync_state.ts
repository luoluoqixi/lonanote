import { useColorSchemeSettings, useGlobalSettings, useUiPreferences } from "@/hooks/settings";

import type { SettingsRouteKey } from "./settings_route_registry";

export type SettingsSyncSnapshot = {
  error: string | null;
  isLoading: boolean;
};

function mergeSettingsSyncState(...states: SettingsSyncSnapshot[]): SettingsSyncSnapshot {
  return {
    error: states.find((state) => state.error != null)?.error ?? null,
    isLoading: states.some((state) => state.isLoading),
  };
}

export function useSettingsHomeSyncState(): SettingsSyncSnapshot {
  const globalSettingsState = useGlobalSettings();
  const uiPreferencesState = useUiPreferences();
  const colorSchemeSettingsState = useColorSchemeSettings();

  return mergeSettingsSyncState(
    { error: globalSettingsState.error, isLoading: globalSettingsState.isLoading },
    { error: uiPreferencesState.error, isLoading: uiPreferencesState.isLoading },
    { error: colorSchemeSettingsState.error, isLoading: colorSchemeSettingsState.isLoading },
  );
}

export function useSettingsSectionSyncState(sectionKey: SettingsRouteKey): SettingsSyncSnapshot {
  const globalSettingsState = useGlobalSettings();
  const uiPreferencesState = useUiPreferences();
  const colorSchemeSettingsState = useColorSchemeSettings();

  switch (sectionKey) {
    case "appearance":
      return mergeSettingsSyncState(
        { error: colorSchemeSettingsState.error, isLoading: colorSchemeSettingsState.isLoading },
        { error: uiPreferencesState.error, isLoading: uiPreferencesState.isLoading },
      );
    default:
      return mergeSettingsSyncState(
        { error: globalSettingsState.error, isLoading: globalSettingsState.isLoading },
        { error: uiPreferencesState.error, isLoading: uiPreferencesState.isLoading },
      );
  }
}
