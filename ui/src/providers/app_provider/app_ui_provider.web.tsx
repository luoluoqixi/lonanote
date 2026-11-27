import { useEffect, useMemo } from "react";
import {
  MenuProvider,
  type NativeMenuRequest,
  RootProvider,
  resolveGeneratedAccentTheme,
} from "rn-ui-kit";

import {
  resolveDesktopContextMenuNative,
  resolveDesktopMenuBackend,
} from "@/api/common/desktop_menu_policy";
import { isTauri, os } from "@/api/common/platform";
import { showTauriContextMenu } from "@/api/common/tauri_context_menu.web";
import { showWcPopupContextMenu } from "@/api/common/wcpopup_context_menu.web";
import { useColorSchemeSettings } from "@/hooks/settings/use_color_scheme_settings";
import { useDesktopAccentColor } from "@/hooks/settings/use_desktop_accent_color";
import { useDesktopWindowBackground } from "@/hooks/settings/use_desktop_window_background";
import { useDesktopZoomFactor } from "@/hooks/settings/use_desktop_zoom_factor";
import { useUiFontRuntime } from "@/hooks/settings/use_ui_font_runtime";
import { applyDocumentTheme } from "@/stores/ui";
import { accentThemeNames } from "@/theme/accent_themes";
import {
  STANDARD_IOS_BACKGROUND_COLORS,
  WORKBENCH_BACKGROUND_COLORS,
} from "@/theme/app_background";
import { composeWorkbenchTheme } from "@/theme/workbench_theme";

import type { AppProviderProps } from "./types";

export function AppUiProvider({ children }: AppProviderProps) {
  const uiFont = useUiFontRuntime();
  const fontProviderProps = { textFontFamily: uiFont.font?.family };
  const { isLoaded, preferredColorScheme, preferences, resolvedColorScheme } =
    useColorSchemeSettings();

  const tauriDesktop = isTauri() && preferences.shell.layoutMode === "desktop";
  const menuStyle = preferences.appearance.contextMenuStyle;
  const nativeMenus =
    preferences.shell.layoutMode !== "desktop"
      ? undefined
      : tauriDesktop
        ? resolveDesktopContextMenuNative(preferences.shell.layoutMode, os(), menuStyle)
        : false;
  const menuConfig = useMemo(
    () => ({
      native: nativeMenus,
      webContentMaxHeight:
        preferences.shell.layoutMode === "desktop" ? "calc(100vh - 24px)" : undefined,
      showNativeMenu:
        nativeMenus && tauriDesktop
          ? resolveDesktopMenuBackend(os()) === "wcpopup"
            ? (request: NativeMenuRequest) => showWcPopupContextMenu(request, resolvedColorScheme)
            : showTauriContextMenu
          : undefined,
      onNativeMenuError: (error: unknown) => console.warn("无法打开原生菜单", error),
    }),
    [menuStyle, nativeMenus, preferences.shell.layoutMode, resolvedColorScheme, tauriDesktop],
  );

  useDesktopAccentColor();
  useDesktopWindowBackground(preferredColorScheme, resolvedColorScheme, isLoaded);
  useDesktopZoomFactor();

  useEffect(() => {
    applyDocumentTheme(resolvedColorScheme);
  }, [resolvedColorScheme]);

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
          ? composeWorkbenchTheme(resolveGeneratedAccentTheme(preferences.appearance.accentColor))
          : undefined
      }
    >
      <MenuProvider value={menuConfig}>{children}</MenuProvider>
    </RootProvider>
  );
}
