import { GestureHandlerRootView } from "react-native-gesture-handler";

import type { RootProviderProps } from "./types";
import { UIProvider } from "./ui-provider.web";

export function RootProvider({ children, nativeConfig }: RootProviderProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UIProvider nativeConfig={nativeConfig}>{children}</UIProvider>
    </GestureHandlerRootView>
  );
}
