import { Avatar as HeroUIAvatar } from "heroui-native";

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
  void webProps;
  return (
    <HeroUIAvatar
      alt={alt ?? ""}
      className={className}
      color={color}
      size={size}
      variant={variant}
      {...(nativeProps as any)}
    >
      {src ? <HeroUIAvatar.Image accessibilityLabel={alt} source={{ uri: src }} /> : null}
      {fallback != null ? <HeroUIAvatar.Fallback>{fallback}</HeroUIAvatar.Fallback> : null}
    </HeroUIAvatar>
  );
}
