import { RadioGroup as HeroUIRadioGroup } from "heroui-native";

import type { RadioGroupItemProps, RadioGroupProps } from "./types";

function RadioGroupRoot({
  accessibilityLabel,
  children,
  className,
  onValueChange,
  value,
  variant,
}: RadioGroupProps) {
  return (
    <HeroUIRadioGroup
      accessibilityLabel={accessibilityLabel}
      className={className}
      onValueChange={onValueChange ?? (() => {})}
      value={value}
      variant={variant}
    >
      {children}
    </HeroUIRadioGroup>
  );
}

function RadioGroupItem({
  accessibilityLabel,
  children,
  className,
  isDisabled,
  value,
}: RadioGroupItemProps) {
  return (
    <HeroUIRadioGroup.Item
      accessibilityLabel={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      value={value}
    >
      {children}
    </HeroUIRadioGroup.Item>
  );
}

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Root: RadioGroupRoot,
  Item: RadioGroupItem,
});
