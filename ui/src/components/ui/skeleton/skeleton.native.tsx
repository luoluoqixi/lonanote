import { Skeleton as HeroUISkeleton } from "heroui-native";

import type { SkeletonProps } from "./types";

export function Skeleton({
  animationType = "shimmer",
  children,
  className,
  isLoading = true,
  nativeProps,
  webProps,
}: SkeletonProps) {
  void webProps;
  return (
    <HeroUISkeleton
      className={className}
      isLoading={isLoading}
      variant={animationType}
      {...(nativeProps as any)}
    >
      {children}
    </HeroUISkeleton>
  );
}
