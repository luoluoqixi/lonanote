import { RootProvider } from "rn-ui-kit";

import { useUiPreferences } from "@/hooks/settings";
import { accentThemeNames } from "@/theme/accent_themes";

import tamaguiConfig from "../../../tamagui.config";
import type { AppProviderProps } from "./types";

export function AppProvider({ children }: AppProviderProps) {
  const { preferences } = useUiPreferences();

  return (
    <RootProvider
      accentThemeNames={accentThemeNames}
      preferences={preferences}
      tamaguiConfig={tamaguiConfig}
    >
      {children}
    </RootProvider>
  );
}
