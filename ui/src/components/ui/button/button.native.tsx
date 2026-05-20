import { Button as HeroUIButton } from "heroui-native";

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
      accessibilityLabel={accessibilityLabel}
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
