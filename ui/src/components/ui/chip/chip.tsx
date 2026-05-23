import { Chip as HeroUIChip } from "heroui-native";

import type { ChipLabelProps, ChipProps } from "./types";

function mapChipVariant(variant: ChipProps["variant"]) {
  switch (variant) {
    case "outline":
      return "tertiary";
    case "soft":
      return "soft";
    case "solid":
    default:
      return "primary";
  }
}

export function Chip({ children, className, color, size, variant }: ChipProps) {
  return (
    <HeroUIChip className={className} color={color} size={size} variant={mapChipVariant(variant)}>
      {children}
    </HeroUIChip>
  );
}

export function ChipLabel({ children, className }: ChipLabelProps) {
  return <HeroUIChip.Label className={className}>{children}</HeroUIChip.Label>;
}
