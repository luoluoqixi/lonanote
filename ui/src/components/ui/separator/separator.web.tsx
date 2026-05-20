import { Separator as HeroUISeparator } from "@heroui/react";

import type { SeparatorProps } from "./types";

export function Separator({ className, orientation = "horizontal" }: SeparatorProps) {
  return <HeroUISeparator className={className} orientation={orientation} />;
}
