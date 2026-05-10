import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { RootProviderProps } from "./types";
import { UIProvider } from "./ui-provider.native";

export function RootProvider({ children, nativeConfig }: RootProviderProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UIProvider nativeConfig={nativeConfig}>{children}</UIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
