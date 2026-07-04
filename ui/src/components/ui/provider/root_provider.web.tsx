import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  useColorSchemeSettings,
  useDesktopAccentColor,
  useDesktopWindowBackground,
  useDesktopZoomFactor,
} from "@/hooks/settings";
import { useDesktopWindowState } from "@/hooks/settings/use_desktop_window_state";
import { applyDocumentTheme } from "@/stores/ui";
import { getAccentThemePreset } from "@/theme/accent_themes";

import { SheetProvider } from "../sheet/provider";
import type { RootProviderProps } from "./types";
import { UIProvider } from "./ui_provider";

export function RootProvider({ children }: RootProviderProps) {
  const { isLoaded, preferredColorScheme, preferences, resolvedColorScheme } =
    useColorSchemeSettings();
  const accentThemeName = getAccentThemePreset(preferences.appearance.accentColor).themeName;

  useDesktopAccentColor();
  useDesktopWindowBackground(preferredColorScheme, resolvedColorScheme, isLoaded);
  useDesktopZoomFactor();
  useDesktopWindowState();

  useEffect(() => {
    applyDocumentTheme(resolvedColorScheme);
  }, [resolvedColorScheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UIProvider accentThemeName={accentThemeName} colorScheme={resolvedColorScheme}>
          <SheetProvider>{children}</SheetProvider>
        </UIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
