import { Button as HeroUIButton } from "@heroui/react";

import type { ButtonProps } from "./types";

export function Button({
  accessibilityLabel,
  children,
  className,
  isDisabled,
  onPress,
  isIconOnly,
  nativeProps,
  size = "md",
  variant = "primary",
  webProps,
}: ButtonProps) {
  void nativeProps;
  return (
    <HeroUIButton
      aria-label={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      onPress={onPress}
      size={size}
      variant={variant}
      isIconOnly={isIconOnly}
      {...(webProps as any)}
    >
      {children}
    </HeroUIButton>
  );
}
