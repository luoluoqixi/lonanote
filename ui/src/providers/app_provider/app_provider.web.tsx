import { useEffect } from "react";
import { RootProvider, resolveGeneratedAccentTheme } from "rn-ui-kit";

import {
  useColorSchemeSettings,
  useDesktopAccentColor,
  useDesktopWindowBackground,
  useDesktopZoomFactor,
} from "@/hooks/settings";
import { useDesktopWindowState } from "@/hooks/settings/use_desktop_window_state";
import { applyDocumentTheme } from "@/stores/ui";
import { accentThemeNames } from "@/theme/accent_themes";
import {
  STANDARD_IOS_BACKGROUND_COLORS,
  WORKBENCH_BACKGROUND_COLORS,
} from "@/theme/app_background";
import { composeWorkbenchTheme } from "@/theme/workbench_theme";

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
      appBackgroundColors={
        preferences.shell.layoutMode === "desktop"
          ? WORKBENCH_BACKGROUND_COLORS
          : STANDARD_IOS_BACKGROUND_COLORS
      }
      preferences={preferences}
      theme={
        preferences.shell.layoutMode === "desktop"
          ? composeWorkbenchTheme(
              resolveGeneratedAccentTheme(preferences.appearance.accentColor),
              preferences.appearance.backgroundFollowsTheme,
            )
          : undefined
      }
    >
      {children}
    </RootProvider>
  );
}
