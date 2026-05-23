import { Chip as WebChip } from "@heroui/react";
import { Chip as NativeChip } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";

export type ChipColor = "accent" | "default" | "success" | "warning" | "danger";
export type ChipSize = "sm" | "md" | "lg";
export type ChipVariant = "solid" | "soft" | "outline";

type ChipPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

export interface ChipProps extends ChipPlatformProps<
  ComponentProps<typeof WebChip>,
  ComponentProps<typeof NativeChip>
> {
  children?: ReactNode;
  className?: string;
  color?: ChipColor;
  size?: ChipSize;
  variant?: ChipVariant;
}

export interface ChipLabelProps extends ChipPlatformProps<
  ComponentProps<typeof WebChip.Label>,
  ComponentProps<typeof NativeChip.Label>
> {
  children?: ReactNode;
  className?: string;
}
