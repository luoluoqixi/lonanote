import { Checkbox as HeroUICheckbox } from "@heroui/react";

import type { CheckboxProps } from "./types";

export function Checkbox({
  accessibilityLabel,
  children,
  className,
  isDisabled,
  isInvalid,
  onValueChange,
  value,
}: CheckboxProps) {
  return (
    <HeroUICheckbox
      aria-label={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isSelected={value}
      onChange={onValueChange}
    >
      {children}
    </HeroUICheckbox>
  );
}
