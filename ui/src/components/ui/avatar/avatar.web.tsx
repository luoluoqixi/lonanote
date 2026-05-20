import { Avatar as HeroUIAvatar } from "@heroui/react";

import type { AvatarProps } from "./types";

export function Avatar({
  alt,
  className,
  color,
  fallback,
  size = "md",
  src,
  variant,
}: AvatarProps) {
  return (
    <HeroUIAvatar className={className} color={color} size={size} variant={variant}>
      {src ? <HeroUIAvatar.Image alt={alt} src={src} /> : null}
      {fallback != null ? <HeroUIAvatar.Fallback>{fallback}</HeroUIAvatar.Fallback> : null}
    </HeroUIAvatar>
  );
}
