import type { ResolvedColorScheme } from "@/hooks/settings";
import { getStandardAppBackgroundColors } from "@/theme/app_background";

export function getAppWindowBackgroundColor(colorScheme: ResolvedColorScheme): string {
  return getStandardAppBackgroundColors(colorScheme).screen;
}
