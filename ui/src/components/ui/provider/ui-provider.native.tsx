import { HeroUINativeProvider } from "heroui-native";

import type { UIProviderProps } from "./types";

export function UIProvider({ children, nativeConfig }: UIProviderProps) {
  return <HeroUINativeProvider config={nativeConfig}>{children}</HeroUINativeProvider>;
}
