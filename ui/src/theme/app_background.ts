import type { AppBackgroundColorsConfig } from "rn-ui-kit";

import type { ResolvedColorScheme } from "@/hooks/settings";

export type AppBackgroundLevel = "screen" | "sheet" | "card" | "header";

export type AppBackgroundColors = Record<AppBackgroundLevel, string>;

export const STANDARD_IOS_BACKGROUND_COLORS: AppBackgroundColorsConfig = {
  false: {
    light: {
      screen: "#F2F2F7",
      sheet: "#F2F2F7",
      card: "#FFFFFF",
      header: "#F7F7FA",
    },
    dark: {
      screen: "#0e0e0e",
      sheet: "#0e0e0e",
      card: "#1C1C1E",
      header: "#1C1C1E",
    },
  },
};

export function getStandardAppBackgroundColors(
  colorScheme: ResolvedColorScheme,
): AppBackgroundColors {
  return STANDARD_IOS_BACKGROUND_COLORS.false![colorScheme];
}
