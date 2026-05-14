import { useEffect, useEffectEvent, useRef } from "react";

import { win } from "@/api/commands";
import { isTauri } from "@/api/common";
import type { ColorSchemeSetting } from "@/stores/ui";

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
  preferredColorScheme: ColorSchemeSetting,
  resolvedColorScheme: ResolvedColorScheme,
  isLoaded: boolean,
) {
  const lastAppliedColorRef = useRef<string | null>(null);

  const applyWindowBackground = useEffectEvent(async (nextColorScheme: ResolvedColorScheme) => {
    if (!isLoaded || !isTauri()) {
      return;
    }

    const nextColor = getDesktopWindowBackgroundColor(nextColorScheme);
    if (lastAppliedColorRef.current === nextColor) {
      return;
    }

    try {
      const applied = await win.setBgColor(nextColor);
      // console.log(
      //   `[appearance] applied desktop window background color ${nextColor} for theme ${nextColorScheme}`,
      //   { applied },
      // );
      if (!applied) {
        console.error("[appearance] desktop window background command returned false");
        return;
      }

      lastAppliedColorRef.current = nextColor;
    } catch (error) {
      console.error("[appearance] failed to apply desktop window background", error);
    }
  });

  useEffect(() => {
    void applyWindowBackground(resolvedColorScheme);
  }, [applyWindowBackground, resolvedColorScheme]);

  useEffect(() => {
    if (
      !isLoaded ||
      !isTauri() ||
      preferredColorScheme !== "system" ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
    const syncFromSystemTheme = (matches: boolean) => {
      void applyWindowBackground(matches ? "dark" : "light");
    };
    const handleThemeChange = (event: MediaQueryListEvent) => {
      syncFromSystemTheme(event.matches);
    };

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", handleThemeChange);
      return () => {
        mediaQueryList.removeEventListener("change", handleThemeChange);
      };
    }

    mediaQueryList.addListener(handleThemeChange);
    return () => {
      mediaQueryList.removeListener(handleThemeChange);
    };
  }, [applyWindowBackground, isLoaded, preferredColorScheme]);
}
