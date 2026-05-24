import { Toaster } from "@tamagui/toast/v2";
import { TamaguiProvider } from "tamagui";

import config from "../../../../tamagui.config";
import type { UIProviderProps } from "./types";

export function UIProvider({ children, colorScheme }: UIProviderProps) {
  return (
    <TamaguiProvider config={config} defaultTheme={colorScheme}>
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
    </TamaguiProvider>
  );
}
