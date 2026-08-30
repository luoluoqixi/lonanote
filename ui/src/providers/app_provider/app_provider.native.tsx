import { RootProvider } from "rn-ui-kit";

import { useUiPreferences } from "@/hooks/settings";
import { accentThemeNames } from "@/theme/accent_themes";
import { STANDARD_IOS_BACKGROUND_COLORS } from "@/theme/app_background";

import type { AppProviderProps } from "./types";

export function AppProvider({ children }: AppProviderProps) {
  const { preferences } = useUiPreferences();

  return (
    <RootProvider
      accentThemeNames={accentThemeNames}
      appBackgroundColors={STANDARD_IOS_BACKGROUND_COLORS}
      preferences={preferences}
    >
      {children}
    </RootProvider>
  );
}
