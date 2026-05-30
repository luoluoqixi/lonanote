import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import config from "../../../../tamagui.config";
import { NativeHapticsProvider } from "../utils";
import { Toaster } from "./toaster";
import type { UIProviderProps } from "./types";

export function UIProvider({
  children,
  colorScheme,
  defaultNativeHapticsEnabled = false,
}: UIProviderProps) {
  const insets = useSafeAreaInsets();
  return (
    <TamaguiProvider config={config} defaultTheme={colorScheme} insets={insets}>
      <NativeHapticsProvider enabledByDefault={defaultNativeHapticsEnabled}>
        {children}
        <Toaster />
        {/* <ToastProvider
          swipeDirection="horizontal"
          duration={6000}
          native={
            [
              // uncomment the next line to do native toasts on mobile. NOTE: it'll require you making a dev build and won't work with Expo Go
              // "mobile",
            ]
          }
        >
        </ToastProvider> */}
      </NativeHapticsProvider>
    </TamaguiProvider>
  );
}
