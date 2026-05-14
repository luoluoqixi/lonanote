import { useEffect } from "react";

import { win } from "@/api/commands";
import { isDesktop, isTauri } from "@/api/common";

import type { ResolvedColorScheme } from "./use_color_scheme_settings";

const DESKTOP_WINDOW_BACKGROUND_COLORS: Record<ResolvedColorScheme, string> = {
  light: "#F5F5F5",
  dark: "#18181B",
};

export function getDesktopWindowBackgroundColor(colorScheme: ResolvedColorScheme): string {
  return DESKTOP_WINDOW_BACKGROUND_COLORS[colorScheme];
}

// Keep the native desktop window background aligned with the resolved app theme.
export function useDesktopWindowBackground(
  resolvedColorScheme: ResolvedColorScheme,
  isLoaded: boolean,
) {
  useEffect(() => {
    if (!isLoaded || !isTauri() || !isDesktop()) {
      return;
    }

    void (async () => {
      try {
        await win.setBgColor(getDesktopWindowBackgroundColor(resolvedColorScheme));
      } catch (error) {
        console.error("[appearance] failed to apply desktop window background", error);
      }
    })();
  }, [isLoaded, resolvedColorScheme]);
}
