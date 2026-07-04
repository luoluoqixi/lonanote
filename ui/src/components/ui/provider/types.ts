import type { ReactNode } from "react";

import type { ResolvedColorScheme } from "@/hooks/settings";
import type { AccentThemeName } from "@/theme/accent_themes";

export interface UIProviderProps {
  accentThemeName?: AccentThemeName;
  children: ReactNode;
  colorScheme?: ResolvedColorScheme;
  defaultNativeHapticsEnabled?: boolean;
}

export interface RootProviderProps {
  children: ReactNode;
}
