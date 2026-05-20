import { Chip as HeroUIChip } from "@heroui/react";

import type { ChipLabelProps, ChipProps } from "./types";

export function Chip({ children, className }: ChipProps) {
  return <HeroUIChip className={className}>{children}</HeroUIChip>;
}

export function ChipLabel({ children, className }: ChipLabelProps) {
  return <HeroUIChip.Label className={className}>{children}</HeroUIChip.Label>;
}
