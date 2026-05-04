import { Button as HeroUINativeButton } from "heroui-native";
import { useRef } from "react";
import { Animated, Easing } from "react-native";

import type { ButtonProps } from "./types";

const WEB_BUTTON_SCALE_VALUE = 0.96;
const WEB_BUTTON_ANIMATION_DURATION = 140;

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
  children,
  className,
  isDisabled,
  onPress,
  size = "md",
  variant = "primary",
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const buttonClassName = [getVariantOverrideClassName(variant), className]
    .filter(Boolean)
    .join(" ");

  const heroVariant = getWebSafeVariant(variant);

  function animateScale(toValue: number) {
    Animated.timing(scale, {
      toValue,
      duration: WEB_BUTTON_ANIMATION_DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <HeroUINativeButton
        animation={false}
        className={buttonClassName}
        feedbackVariant="none"
        isDisabled={isDisabled}
        onPress={onPress}
        onPressIn={() => {
          if (!isDisabled) {
            animateScale(WEB_BUTTON_SCALE_VALUE);
          }
        }}
        onPressOut={() => {
          animateScale(1);
        }}
        size={size}
        variant={heroVariant}
      >
        {children}
      </HeroUINativeButton>
    </Animated.View>
  );
}
