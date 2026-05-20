import { Separator as HeroUISeparator } from "heroui-native";

import type { SeparatorProps } from "./types";

export function Separator({ className, orientation = "horizontal" }: SeparatorProps) {
  return <HeroUISeparator className={className} orientation={orientation} />;
}
