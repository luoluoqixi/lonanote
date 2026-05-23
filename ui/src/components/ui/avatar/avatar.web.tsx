import { Avatar as HeroUIAvatar } from "@heroui/react";

import type { AvatarProps } from "./types";

export function Avatar({
  alt,
  className,
  color,
  fallback,
  nativeProps,
  size = "md",
  src,
  variant,
  webProps,
}: AvatarProps) {
  void nativeProps;
  return (
    <HeroUIAvatar
      className={className}
      color={color}
      size={size}
      variant={variant}
      {...(webProps as any)}
    >
      {src ? <HeroUIAvatar.Image alt={alt} src={src} /> : null}
      {fallback != null ? <HeroUIAvatar.Fallback>{fallback}</HeroUIAvatar.Fallback> : null}
    </HeroUIAvatar>
  );
}
