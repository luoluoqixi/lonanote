import { Checkbox as HeroUICheckbox } from "heroui-native";

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
      accessibilityLabel={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isSelected={value}
      onSelectedChange={onValueChange}
    >
      {children}
    </HeroUICheckbox>
  );
}
