import type { ReactNode } from "react";

export type SurfaceVariant = "default" | "accent" | "secondary" | "subtle";

export interface SurfaceProps {
  children?: ReactNode;
  className?: string;
}
