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
}: LinkProps) {
  return (
    <HeroUILink
      aria-label={accessibilityLabel}
      className={className}
      href={href}
      isDisabled={isDisabled}
      onPress={onPress}
      rel={href ? rel : undefined}
      target={href ? target : undefined}
    >
      {children}
    </HeroUILink>
  );
}
