import { Surface as HeroUISurface } from "heroui-native";

import type { SurfaceProps } from "./types";

export function Surface({ children, className, nativeProps, webProps }: SurfaceProps) {
  void webProps;
  return (
    <HeroUISurface className={className} {...(nativeProps as any)}>
      {children}
    </HeroUISurface>
  );
}
