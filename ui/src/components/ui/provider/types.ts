import type { HeroUINativeProviderProps } from "heroui-native";
import type { ReactNode } from "react";

export interface UIProviderProps {
  children: ReactNode;
  nativeConfig?: HeroUINativeProviderProps["config"];
}

export interface RootProviderProps extends UIProviderProps {}
