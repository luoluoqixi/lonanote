import { Surface as HeroUISurface } from "heroui-native";

import type { SurfaceProps } from "./types";

export function Surface({ children, className }: SurfaceProps) {
  return <HeroUISurface className={className}>{children}</HeroUISurface>;
}
