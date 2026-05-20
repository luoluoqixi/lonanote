import { Chip as HeroUIChip } from "heroui-native";

import type { ChipLabelProps, ChipProps } from "./types";

export function Chip({ children, className, nativeProps, webProps }: ChipProps) {
  void webProps;
  return (
    <HeroUIChip className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIChip>
  );
}

export function ChipLabel({ children, className, nativeProps, webProps }: ChipLabelProps) {
  void webProps;
  return (
    <HeroUIChip.Label className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIChip.Label>
  );
}
