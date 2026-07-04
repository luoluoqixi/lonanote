import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TamaguiProvider, Theme } from "tamagui";

import config from "../../../../tamagui.config";
import { NativeDialogProvider } from "../native_dialog";
import { Toaster } from "../toast/toaster";
import { NativeHapticsProvider } from "../utils";
import type { UIProviderProps } from "./types";

export function UIProvider({
  accentThemeName = "ocean",
  children,
  colorScheme,
  defaultNativeHapticsEnabled = false,
}: UIProviderProps) {
  const insets = useSafeAreaInsets();
  return (
    <TamaguiProvider config={config} defaultTheme={colorScheme} insets={insets}>
      <Theme name={accentThemeName}>
        <NativeDialogProvider>
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
        </NativeDialogProvider>
      </Theme>
    </TamaguiProvider>
  );
}
