import { CloseButton as HeroUICloseButton } from "heroui-native";

import type { CloseButtonProps } from "./types";

export function CloseButton({
  accessibilityLabel,
  className,
  iconProps,
  isDisabled,
  onPress,
}: CloseButtonProps) {
  return (
    <HeroUICloseButton
      accessibilityLabel={accessibilityLabel}
      className={className}
      iconProps={iconProps}
      isDisabled={isDisabled}
      onPress={onPress}
    />
  );
}
