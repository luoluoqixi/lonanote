import { type ColorSchemeName, useColorScheme } from "react-native";

import type { ColorSchemeSetting } from "@/api/commands/store";

import { useUiPreferences } from "./use_ui_preferences";

export type ResolvedColorScheme = "light" | "dark";

function normalizeSystemColorScheme(colorScheme: ColorSchemeName) {
  return colorScheme === "dark" ? "dark" : "light";
}

export function resolveColorSchemeSettings(
  preferredColorScheme: ColorSchemeSetting,
  systemColorScheme: ColorSchemeName,
): ResolvedColorScheme {
  if (preferredColorScheme === "system") {
    return normalizeSystemColorScheme(systemColorScheme);
  }

  return preferredColorScheme;
}

export function useColorSchemeSettings() {
  const systemColorScheme = useColorScheme();
  const { preferences, isLoaded, isLoading, error, reload, save, patchPreferences, updateAndSave } =
    useUiPreferences();

  const preferredColorScheme = preferences.appearance.themeMode;
  const normalizedSystemColorScheme = normalizeSystemColorScheme(systemColorScheme);
  const resolvedColorScheme = resolveColorSchemeSettings(preferredColorScheme, systemColorScheme);

  return {
    preferences,
    isLoaded,
    isLoading,
    error,
    preferredColorScheme,
    systemColorScheme: normalizedSystemColorScheme,
    resolvedColorScheme,
    isSystemColorScheme: preferredColorScheme === "system",
    reload,
    save,
    setPreferredColorScheme: (nextColorScheme: ColorSchemeSetting) => {
      return patchPreferences((currentPreferences) => ({
        ...currentPreferences,
        appearance: {
          ...currentPreferences.appearance,
          themeMode: nextColorScheme,
        },
      }));
    },
    setPreferredColorSchemeAndSave: async (nextColorScheme: ColorSchemeSetting) => {
      return updateAndSave((currentPreferences) => ({
        ...currentPreferences,
        appearance: {
          ...currentPreferences.appearance,
          themeMode: nextColorScheme,
        },
      }));
    },
  };
}
