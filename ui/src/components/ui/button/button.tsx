import { Button as HeroUIButton } from "heroui-native";

import type { ButtonProps } from "./types";

export function Button({
  accessibilityLabel,
  children,
  className,
  isDisabled,
  isIconOnly,
  onPress,
  size = "md",
  variant = "primary",
}: ButtonProps) {
  return (
    <HeroUIButton
      accessibilityLabel={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      isIconOnly={isIconOnly}
      onPress={onPress}
      size={size}
      variant={variant}
    >
      {children}
    </HeroUIButton>
  );
}
