import type { SkeletonRootProps as WebSkeletonRootProps } from "@heroui/react";
import type { SkeletonProps as NativeSkeletonProps } from "heroui-native";
import type { ReactNode } from "react";

export type SkeletonAnimationType = "none" | "pulse" | "shimmer";

type SkeletonPlatformProps = {
  nativeProps?: Omit<NativeSkeletonProps, "children" | "className" | "isLoading" | "variant">;
  webProps?: Omit<WebSkeletonRootProps<any>, "children" | "className" | "animationType">;
};

export interface SkeletonProps extends SkeletonPlatformProps {
  animationType?: SkeletonAnimationType;
  children?: ReactNode;
  className?: string;
  isLoading?: boolean;
}
