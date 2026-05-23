import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import { useColorSchemeSettings } from "@/hooks/settings";

import type { RootProviderProps } from "./types";
import { UIProvider } from "./ui_provider";

export function RootProvider({ children, nativeConfig }: RootProviderProps) {
  const { resolvedColorScheme } = useColorSchemeSettings();

  useEffect(() => {
    Uniwind.setTheme(resolvedColorScheme);
  }, [resolvedColorScheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UIProvider nativeConfig={nativeConfig}>{children}</UIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
