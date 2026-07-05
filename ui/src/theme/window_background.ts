import type { ResolvedColorScheme } from "@/hooks/settings";

const APP_WINDOW_BACKGROUND_COLORS: Record<ResolvedColorScheme, string> = {
  light: "#F8F9FA",
  dark: "#121418",
};

export function getAppWindowBackgroundColor(colorScheme: ResolvedColorScheme): string {
  return APP_WINDOW_BACKGROUND_COLORS[colorScheme];
}
