import { Checkbox as HeroUICheckbox } from "@heroui/react";

import type { CheckboxProps } from "./types";

export function Checkbox({
  accessibilityLabel,
  children,
  className,
  isDisabled,
  isInvalid,
  nativeProps,
  onValueChange,
  value,
  webProps,
}: CheckboxProps) {
  void nativeProps;
  return (
    <HeroUICheckbox
      aria-label={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isSelected={value}
      onChange={onValueChange}
      {...(webProps as any)}
    >
      <HeroUICheckbox.Control>
        <HeroUICheckbox.Indicator />
      </HeroUICheckbox.Control>
      {children ? <HeroUICheckbox.Content>{children}</HeroUICheckbox.Content> : null}
    </HeroUICheckbox>
  );
}
