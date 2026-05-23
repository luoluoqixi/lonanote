import { RadioGroup as HeroUIRadioGroup } from "heroui-native";

import type { RadioGroupItemProps, RadioGroupProps } from "./types";

function RadioGroupRoot({
  accessibilityLabel,
  children,
  className,
  nativeProps,
  onValueChange,
  value,
  variant,
  webProps,
}: RadioGroupProps) {
  void webProps;
  return (
    <HeroUIRadioGroup
      accessibilityLabel={accessibilityLabel}
      className={className}
      onValueChange={onValueChange}
      value={value}
      variant={variant}
      {...(nativeProps as any)}
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
  nativeProps,
  value,
  webProps,
}: RadioGroupItemProps) {
  void webProps;
  return (
    <HeroUIRadioGroup.Item
      accessibilityLabel={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      value={value}
      {...(nativeProps as any)}
    >
      {children}
    </HeroUIRadioGroup.Item>
  );
}

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Root: RadioGroupRoot,
  Item: RadioGroupItem,
});
