import { Skeleton as HeroUISkeleton } from "@heroui/react";
import { Fragment } from "react";

import type { SkeletonProps } from "./types";

export function Skeleton({
  animationType = "shimmer",
  children,
  className,
  isLoading = true,
  nativeProps,
  webProps,
}: SkeletonProps) {
  void nativeProps;

  if (!isLoading) {
    return <Fragment>{children}</Fragment>;
  }

  return (
    <HeroUISkeleton animationType={animationType} className={className} {...(webProps as any)}>
      {children}
    </HeroUISkeleton>
  );
}
