import { useEffect } from "react";

import { isDesktop, isTauri } from "@/api/common";
import { getAccentThemePreset } from "@/theme/accent_themes";

import { useUiPreferences } from "./use_ui_preferences";

// 保持桌面层补充的 accent CSS variable 与 UI preferences 同步。
export function useDesktopAccentColor() {
  const { isLoaded, preferences } = useUiPreferences();

  useEffect(() => {
    if (!isLoaded || !isTauri() || !isDesktop()) {
      return;
    }

    const rootElement = document.documentElement;
    const preset = getAccentThemePreset(preferences.appearance.accentColor);

    rootElement.style.setProperty("--accent", preset.accent);
    rootElement.style.setProperty("--accent-foreground", preset.accentForeground);
    rootElement.style.setProperty("--focus", preset.accent);
  }, [isLoaded, preferences.appearance.accentColor]);
}
