import { useEffect } from "react";

import type { AccentColorSetting } from "@/api/commands/store";
import { isDesktop, isTauri } from "@/api/common";

import { useUiPreferences } from "./use_ui_preferences";

const ACCENT_COLOR_PRESETS: Record<
  AccentColorSetting,
  {
    accent: string;
    accentForeground: string;
    label: string;
  }
> = {
  blue: {
    accent: "oklch(0.6204 0.195 253.83)",
    accentForeground: "oklch(0.985 0 0)",
    label: "蓝色",
  },
  emerald: {
    accent: "oklch(0.696 0.17 162.48)",
    accentForeground: "oklch(0.985 0 0)",
    label: "翠绿",
  },
  orange: {
    accent: "oklch(0.705 0.178 48.52)",
    accentForeground: "oklch(0.985 0 0)",
    label: "橙色",
  },
  rose: {
    accent: "oklch(0.645 0.215 16.41)",
    accentForeground: "oklch(0.985 0 0)",
    label: "玫瑰",
  },
};

export function getAccentColorPreset(accentColor: AccentColorSetting) {
  return ACCENT_COLOR_PRESETS[accentColor];
}

// Override theme accent CSS variables on desktop so accent color lives in UI preferences.
export function useDesktopAccentColor() {
  const { isLoaded, preferences } = useUiPreferences();

  useEffect(() => {
    if (!isLoaded || !isTauri() || !isDesktop()) {
      return;
    }

    const rootElement = document.documentElement;
    const preset = getAccentColorPreset(preferences.appearance.accentColor);

    rootElement.style.setProperty("--accent", preset.accent);
    rootElement.style.setProperty("--accent-foreground", preset.accentForeground);
    rootElement.style.setProperty("--focus", preset.accent);
  }, [isLoaded, preferences.appearance.accentColor]);
}
