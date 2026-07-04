import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorSchemeSettings } from "@/hooks/settings";
import { getAccentThemePreset } from "@/theme/accent_themes";

import { SheetProvider } from "../sheet/provider";
import type { RootProviderProps } from "./types";
import { UIProvider } from "./ui_provider";

export function RootProvider({ children }: RootProviderProps) {
  const { preferences, resolvedColorScheme } = useColorSchemeSettings();
  const accentThemeName = getAccentThemePreset(preferences.appearance.accentColor).themeName;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UIProvider accentThemeName={accentThemeName} colorScheme={resolvedColorScheme}>
          <SheetProvider>{children}</SheetProvider>
        </UIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
