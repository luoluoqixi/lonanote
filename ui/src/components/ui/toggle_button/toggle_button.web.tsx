import { ToggleButton as HeroUIToggleButton } from "@heroui/react";

import type { ToggleButtonProps } from "./types";

export function ToggleButton({
  accessibilityLabel,
  children,
  className,
  defaultSelected,
  isDisabled,
  isSelected,
  nativeProps,
  onValueChange,
  webProps,
}: ToggleButtonProps) {
  void nativeProps;
  return (
    <HeroUIToggleButton
      aria-label={accessibilityLabel}
      className={className}
      defaultSelected={defaultSelected}
      isDisabled={isDisabled}
      isSelected={isSelected}
      onChange={onValueChange}
      {...(webProps as any)}
    >
      {children}
    </HeroUIToggleButton>
  );
}
