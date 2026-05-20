import { Checkbox as HeroUICheckbox } from "heroui-native";

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
  void webProps;
  return (
    <HeroUICheckbox
      accessibilityLabel={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isSelected={value}
      onSelectedChange={onValueChange}
      {...(nativeProps as any)}
    >
      {children}
    </HeroUICheckbox>
  );
}
