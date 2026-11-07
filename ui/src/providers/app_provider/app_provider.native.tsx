import { MenuProvider, RootProvider, resolveGeneratedAccentTheme } from "rn-ui-kit";

import { FontProbeHost } from "@/components/settings/font_probe_host.native";
import { useUiPreferences } from "@/hooks/settings";
import { useFontSettings } from "@/hooks/settings/use_font_settings";
import { accentThemeNames } from "@/theme/accent_themes";
import {
  STANDARD_IOS_BACKGROUND_COLORS,
  WORKBENCH_BACKGROUND_COLORS,
} from "@/theme/app_background";
import { composeWorkbenchTheme } from "@/theme/workbench_theme";

import type { AppProviderProps } from "./types";

export function AppProvider({ children }: AppProviderProps) {
  const fonts = useFontSettings();
  const fontProviderProps = { textFontFamily: fonts.ui.font?.family };
  const { preferences } = useUiPreferences();

  return (
    <RootProvider
      {...fontProviderProps}
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
      <MenuProvider
        value={{ native: preferences.shell.layoutMode === "desktop" ? false : undefined }}
      >
        <FontProbeHost />
        {children}
      </MenuProvider>
    </RootProvider>
  );
}
