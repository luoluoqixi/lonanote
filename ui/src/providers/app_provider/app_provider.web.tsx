import { useEffect, useMemo } from "react";
import { MenuProvider, RootProvider, resolveGeneratedAccentTheme } from "rn-ui-kit";

import { resolveDesktopContextMenuNative } from "@/api/common/desktop_menu_policy";
import { isTauri, os } from "@/api/common/platform";
import { showTauriContextMenu } from "@/api/common/tauri_context_menu.web";
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

  const nativeMenus = resolveDesktopContextMenuNative(preferences.shell.layoutMode, os());
  const menuConfig = useMemo(
    () => ({
      native: nativeMenus,
      webContentMaxHeight:
        preferences.shell.layoutMode === "desktop" ? "calc(100vh - 24px)" : undefined,
      showNativeMenu: nativeMenus && isTauri() ? showTauriContextMenu : undefined,
      onNativeMenuError: (error: unknown) => console.warn("无法打开原生菜单", error),
    }),
    [nativeMenus, preferences.shell.layoutMode],
  );

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
      <MenuProvider value={menuConfig}>{children}</MenuProvider>
    </RootProvider>
  );
}
