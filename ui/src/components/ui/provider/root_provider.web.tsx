import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import {
  useColorSchemeSettings,
  useDesktopAccentColor,
  useDesktopZoomFactor,
} from "@/hooks/settings";
import { useDesktopWindowState } from "@/hooks/settings/use_desktop_window_state";

import type { RootProviderProps } from "./types";
import { UIProvider } from "./ui_provider.web";

export function RootProvider({ children, nativeConfig }: RootProviderProps) {
  const { preferredColorScheme } = useColorSchemeSettings();

  useDesktopAccentColor();
  useDesktopZoomFactor();
  useDesktopWindowState();

  useEffect(() => {
    Uniwind.setTheme(preferredColorScheme);
  }, [preferredColorScheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UIProvider nativeConfig={nativeConfig}>{children}</UIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
