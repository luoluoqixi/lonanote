import { Separator as HeroUISeparator } from "heroui-native";

import type { SeparatorProps } from "./types";

export function Separator({
  className,
  nativeProps,
  orientation = "horizontal",
  webProps,
}: SeparatorProps) {
  void webProps;
  return (
    <HeroUISeparator className={className} orientation={orientation} {...(nativeProps as any)} />
  );
}
