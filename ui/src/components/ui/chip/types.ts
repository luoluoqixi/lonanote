import type { ReactNode } from "react";

export type ChipColor = "accent" | "default" | "success" | "warning" | "danger";
export type ChipSize = "sm" | "md" | "lg";
export type ChipVariant = "solid" | "soft" | "outline";

export interface ChipProps {
  children?: ReactNode;
  className?: string;
  color?: ChipColor;
  size?: ChipSize;
  variant?: ChipVariant;
}

export interface ChipLabelProps {
  children?: ReactNode;
  className?: string;
}
