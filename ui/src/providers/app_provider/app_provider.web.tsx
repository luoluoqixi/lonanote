import { useEffect } from "react";
import { RootProvider } from "rn-ui-kit";

import {
  useColorSchemeSettings,
  useDesktopAccentColor,
  useDesktopWindowBackground,
  useDesktopZoomFactor,
} from "@/hooks/settings";
import { useDesktopWindowState } from "@/hooks/settings/use_desktop_window_state";
import { applyDocumentTheme } from "@/stores/ui";
import { accentThemeNames } from "@/theme/accent_themes";

import tamaguiConfig from "../../../tamagui.config";
import type { AppProviderProps } from "./types";

export function AppProvider({ children }: AppProviderProps) {
  const { isLoaded, preferredColorScheme, preferences, resolvedColorScheme } =
    useColorSchemeSettings();

  useDesktopAccentColor();
  useDesktopWindowBackground(preferredColorScheme, resolvedColorScheme, isLoaded);
  useDesktopZoomFactor();
  useDesktopWindowState();

  useEffect(() => {
    applyDocumentTheme(resolvedColorScheme);
  }, [resolvedColorScheme]);

  return (
    <RootProvider
      accentThemeNames={accentThemeNames}
      preferences={preferences}
      tamaguiConfig={tamaguiConfig}
    >
      {children}
    </RootProvider>
  );
}
