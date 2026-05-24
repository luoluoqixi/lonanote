import type { ComponentProps, ReactNode } from "react";
import type { Avatar as TamaguiAvatar } from "tamagui";

export interface AvatarProps extends ComponentProps<typeof TamaguiAvatar> {
  alt?: string;
  fallback?: ReactNode;
  fallbackProps?: AvatarFallbackProps;
  imageProps?: AvatarImageProps;
  src?: string;
}
export type AvatarImageProps = ComponentProps<typeof TamaguiAvatar.Image>;
export type AvatarFallbackProps = ComponentProps<typeof TamaguiAvatar.Fallback>;
