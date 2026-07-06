import { useTheme } from "@/components/ui/theme";
import { type AppBackgroundColors, getStandardAppBackgroundColors } from "@/theme/app_background";

import { useResolvedeColorScheme } from "./use_color_scheme_settings";
import { useUiPreferences } from "./use_ui_preferences";

export function useAppBackgroundColors(): AppBackgroundColors {
  const theme = useTheme();
  const resolvedColorScheme = useResolvedeColorScheme();
  const { preferences } = useUiPreferences();

  if (preferences.appearance.backgroundFollowsTheme) {
    const screen =
      theme.background?.val ?? getStandardAppBackgroundColors(resolvedColorScheme).screen;
    return {
      screen,
      sheet: screen,
      card: theme.color2?.val ?? screen,
      header: theme.color1?.val ?? screen,
    };
  }

  return getStandardAppBackgroundColors(resolvedColorScheme);
}
