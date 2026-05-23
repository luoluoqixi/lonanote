import { HeroUINativeProvider } from "heroui-native";

import { DEFAULT_TOAST_CONFIG } from "./config";
import type { UIProviderProps } from "./types";

export function UIProvider({ children, nativeConfig, toastConfig }: UIProviderProps) {
  const resolvedToastConfig = toastConfig || DEFAULT_TOAST_CONFIG;

  return (
    <HeroUINativeProvider
      config={{
        forceEnableAnimation: true,
        toast: {
          ...resolvedToastConfig,
        },
        ...nativeConfig,
      }}
    >
      {children}
    </HeroUINativeProvider>
  );
}
