import { Button as HeroUINativeButton } from "heroui-native";

import type { ButtonProps } from "./types";

export function Button({
  children,
  className,
  isDisabled,
  onPress,
  size = "md",
  variant = "primary",
}: ButtonProps) {
  return (
    <HeroUINativeButton
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
