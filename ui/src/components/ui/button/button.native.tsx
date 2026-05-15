import { Button as HeroUINativeButton } from "heroui-native";

import type { ButtonProps } from "./types";

export function Button({
  accessibilityLabel,
  children,
  className,
  isDisabled,
  onPress,
  size = "md",
  variant = "primary",
}: ButtonProps) {
  return (
    <HeroUINativeButton
      accessibilityLabel={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      onPress={onPress}
      size={size}
      variant={variant}
    >
      {children}
    </HeroUINativeButton>
  );
}
