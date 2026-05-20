import { Link as HeroUILink } from "@heroui/react";

import type { LinkProps } from "./types";

export function Link({
  accessibilityLabel,
  children,
  className,
  href,
  isDisabled,
  onPress,
  rel,
  target,
  nativeProps,
  webProps,
}: LinkProps) {
  void nativeProps;
  return (
    <HeroUILink
      aria-label={accessibilityLabel}
      className={className}
      href={href}
      isDisabled={isDisabled}
      onPress={onPress}
      rel={href ? rel : undefined}
      target={href ? target : undefined}
      {...(webProps as any)}
    >
      {children}
    </HeroUILink>
  );
}
