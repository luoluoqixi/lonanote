import { Surface as WebSurface } from "@heroui/react";
import { Surface as NativeSurface } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";

export type SurfaceVariant = "default" | "accent" | "secondary" | "subtle";

type SurfacePlatformProps = {
  nativeProps?: Omit<ComponentProps<typeof NativeSurface>, "children" | "className">;
  webProps?: Omit<ComponentProps<typeof WebSurface>, "children" | "className">;
};

export interface SurfaceProps extends SurfacePlatformProps {
  children?: ReactNode;
  className?: string;
}
