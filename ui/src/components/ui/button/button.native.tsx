import { Button as HeroUIButton } from "heroui-native";

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
  void webProps;
  return (
    <HeroUIButton
      accessibilityLabel={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      onPress={onPress}
      size={size}
      variant={variant}
      isIconOnly={isIconOnly}
      {...(nativeProps as any)}
    >
      {children}
    </HeroUIButton>
  );
}
