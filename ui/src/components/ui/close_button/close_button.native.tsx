import { CloseButton as HeroUICloseButton } from "heroui-native";

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
  void webProps;
  return (
    <HeroUICloseButton
      accessibilityLabel={accessibilityLabel}
      className={className}
      iconProps={iconProps}
      isDisabled={isDisabled}
      onPress={onPress}
      {...(nativeProps as any)}
    />
  );
}
