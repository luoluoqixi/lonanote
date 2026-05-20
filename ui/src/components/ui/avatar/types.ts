import { Avatar as WebAvatar } from "@heroui/react";
import { Avatar as NativeAvatar } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";

export type AvatarColor = "accent" | "default" | "success" | "warning" | "danger";
export type AvatarSize = "sm" | "md" | "lg";
export type AvatarVariant = "default" | "soft";

type AvatarPlatformProps = {
  nativeProps?: Omit<
    ComponentProps<typeof NativeAvatar>,
    "alt" | "children" | "className" | "color" | "size" | "variant"
  >;
  webProps?: Omit<
    ComponentProps<typeof WebAvatar>,
    "children" | "className" | "color" | "size" | "variant"
  >;
};

export interface AvatarProps extends AvatarPlatformProps {
  alt?: string;
  className?: string;
  color?: AvatarColor;
  fallback?: ReactNode;
  size?: AvatarSize;
  src?: string;
  variant?: AvatarVariant;
}
