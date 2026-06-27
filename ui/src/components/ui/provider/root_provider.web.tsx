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

import { SheetProvider } from "../sheet/provider";
import type { RootProviderProps } from "./types";
import { UIProvider } from "./ui_provider";

export function RootProvider({ children }: RootProviderProps) {
  const { isLoaded, preferredColorScheme, resolvedColorScheme } = useColorSchemeSettings();

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
        <UIProvider colorScheme={resolvedColorScheme}>
          <SheetProvider>{children}</SheetProvider>
        </UIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
