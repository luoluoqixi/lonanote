import { Skeleton as HeroUISkeleton } from "heroui-native";

import type { SkeletonProps } from "./types";

export function Skeleton({
  animationType = "shimmer",
  children,
  className,
  isLoading = true,
}: SkeletonProps) {
  return (
    <HeroUISkeleton className={className} isLoading={isLoading} variant={animationType}>
      {children}
    </HeroUISkeleton>
  );
}
