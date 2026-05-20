import type { ReactNode } from "react";

export type AvatarColor = "accent" | "default" | "success" | "warning" | "danger";
export type AvatarSize = "sm" | "md" | "lg";
export type AvatarVariant = "default" | "soft";

export interface AvatarProps {
  alt?: string;
  className?: string;
  color?: AvatarColor;
  fallback?: ReactNode;
  size?: AvatarSize;
  src?: string;
  variant?: AvatarVariant;
}
