import { Button as HeroUIButton } from "@heroui/react";

import type { ButtonProps } from "./types";

export function Button({
  accessibilityLabel,
  children,
  className,
  isDisabled,
  onPress,
  isIconOnly,
  size = "md",
  variant = "primary",
}: ButtonProps) {
  return (
    <HeroUIButton
      aria-label={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      onPress={onPress}
      size={size}
      variant={variant}
      isIconOnly={isIconOnly}
    >
      {children}
    </HeroUIButton>
  );
}
