import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorSchemeSettings } from "@/hooks/settings";

import { SheetProvider } from "../sheet/provider";
import type { RootProviderProps } from "./types";
import { UIProvider } from "./ui_provider";

export function RootProvider({ children }: RootProviderProps) {
  const { resolvedColorScheme } = useColorSchemeSettings();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UIProvider colorScheme={resolvedColorScheme}>
          <SheetProvider>{children}</SheetProvider>
        </UIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
