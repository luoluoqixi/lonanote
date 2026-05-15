import { Button as HeroUINativeButton } from "heroui-native";

import type { ButtonProps } from "./types";

function getWebSafeVariant(variant: NonNullable<ButtonProps["variant"]>) {
  switch (variant) {
    case "outline":
    case "ghost":
      return "tertiary" as const;
    default:
      return variant;
  }
}

function getVariantOverrideClassName(variant: NonNullable<ButtonProps["variant"]>) {
  switch (variant) {
    case "outline":
      return "border border-border bg-transparent";
    case "ghost":
      return "bg-transparent";
    default:
      return undefined;
  }
}

export function Button({
  accessibilityLabel,
  children,
  className,
  isDisabled,
  onPress,
  size = "md",
  variant = "primary",
}: ButtonProps) {
  const buttonClassName = [getVariantOverrideClassName(variant), className]
    .filter(Boolean)
    .join(" ");

  const heroVariant = getWebSafeVariant(variant);

  return (
    <HeroUINativeButton
      accessibilityLabel={accessibilityLabel}
      className={buttonClassName}
      isDisabled={isDisabled}
      onPress={onPress}
      size={size}
      variant={heroVariant}
    >
      {children}
    </HeroUINativeButton>
  );
}
