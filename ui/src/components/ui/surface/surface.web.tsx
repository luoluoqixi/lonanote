import { Surface as HeroUISurface } from "@heroui/react";

import type { SurfaceProps } from "./types";

export function Surface({ children, className, nativeProps, webProps }: SurfaceProps) {
  void nativeProps;
  return (
    <HeroUISurface className={className} {...(webProps as any)}>
      {children}
    </HeroUISurface>
  );
}
