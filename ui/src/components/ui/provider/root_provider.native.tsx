import { useEffect } from "react";
import { Appearance } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorSchemeSettings } from "@/hooks/settings";
import { getAccentThemePreset } from "@/theme/accent_themes";
import { getAppWindowBackgroundColor } from "@/theme/window_background";

import { SheetProvider } from "../sheet/provider";
import type { RootProviderProps } from "./types";
import { UIProvider } from "./ui_provider";

export function RootProvider({ children }: RootProviderProps) {
  const { preferredColorScheme, preferences, resolvedColorScheme } = useColorSchemeSettings();
  const accentThemeName = getAccentThemePreset(preferences.appearance.accentColor).themeName;
  const rootBackgroundColor = getAppWindowBackgroundColor(resolvedColorScheme);

  useEffect(() => {
    Appearance.setColorScheme(
      preferredColorScheme === "system" ? "unspecified" : resolvedColorScheme,
    );
  }, [preferredColorScheme, resolvedColorScheme]);

  return (
    <GestureHandlerRootView style={{ backgroundColor: rootBackgroundColor, flex: 1 }}>
      <SafeAreaProvider style={{ backgroundColor: rootBackgroundColor }}>
        <UIProvider accentThemeName={accentThemeName} colorScheme={resolvedColorScheme}>
          <SheetProvider>{children}</SheetProvider>
        </UIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
