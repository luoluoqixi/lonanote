import { CloseButton as HeroUICloseButton } from "@heroui/react";

import type { CloseButtonProps } from "./types";

export function CloseButton({
  accessibilityLabel,
  className,
  iconProps,
  isDisabled,
  nativeProps,
  onPress,
  webProps,
}: CloseButtonProps) {
  void nativeProps;
  void iconProps;
  return (
    <HeroUICloseButton
      aria-label={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      onPress={onPress}
      {...(webProps as any)}
    />
  );
}
