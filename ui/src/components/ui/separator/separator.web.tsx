import { Separator as HeroUISeparator } from "@heroui/react";

import type { SeparatorProps } from "./types";

export function Separator({
  className,
  nativeProps,
  orientation = "horizontal",
  webProps,
}: SeparatorProps) {
  void nativeProps;
  return <HeroUISeparator className={className} orientation={orientation} {...(webProps as any)} />;
}
