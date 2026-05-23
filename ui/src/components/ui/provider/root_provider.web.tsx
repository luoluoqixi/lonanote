import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import {
  useColorSchemeSettings,
  useDesktopAccentColor,
  useDesktopWindowBackground,
  useDesktopZoomFactor,
} from "@/hooks/settings";
import { useDesktopWindowState } from "@/hooks/settings/use_desktop_window_state";
import { applyDocumentTheme } from "@/stores/ui";

import type { RootProviderProps } from "./types";
import { UIProvider } from "./ui_provider";

export function RootProvider({ children, nativeConfig }: RootProviderProps) {
  const { isLoaded, preferredColorScheme, resolvedColorScheme } = useColorSchemeSettings();

  useDesktopAccentColor();
  useDesktopWindowBackground(preferredColorScheme, resolvedColorScheme, isLoaded);
  useDesktopZoomFactor();
  useDesktopWindowState();

  useEffect(() => {
    applyDocumentTheme(resolvedColorScheme);
    Uniwind.setTheme(resolvedColorScheme);
  }, [resolvedColorScheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UIProvider nativeConfig={nativeConfig}>{children}</UIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
