import { Chip as HeroUIChip } from "@heroui/react";

import type { ChipLabelProps, ChipProps } from "./types";

export function Chip({ children, className, nativeProps, webProps }: ChipProps) {
  void nativeProps;
  return (
    <HeroUIChip className={className} {...(webProps as any)}>
      {children}
    </HeroUIChip>
  );
}

export function ChipLabel({ children, className, nativeProps, webProps }: ChipLabelProps) {
  void nativeProps;
  return (
    <HeroUIChip.Label className={className} {...(webProps as any)}>
      {children}
    </HeroUIChip.Label>
  );
}
