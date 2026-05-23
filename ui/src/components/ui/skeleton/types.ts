import type { ReactNode } from "react";

export type SkeletonAnimationType = "none" | "pulse" | "shimmer";

export interface SkeletonProps {
  animationType?: SkeletonAnimationType;
  children?: ReactNode;
  className?: string;
  isLoading?: boolean;
}
