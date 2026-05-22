import { Radio as HeroUIRadio, RadioGroup as HeroUIRadioGroup } from "@heroui/react";

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
  void nativeProps;
  return (
    <HeroUIRadioGroup
      aria-label={accessibilityLabel}
      className={className}
      onChange={onValueChange}
      value={value}
      variant={variant}
      {...(webProps as any)}
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
  void nativeProps;
  return (
    <HeroUIRadio
      aria-label={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      value={value}
      {...(webProps as any)}
    >
      <HeroUIRadio.Control>
        <HeroUIRadio.Indicator />
      </HeroUIRadio.Control>
      {children ? <HeroUIRadio.Content>{children}</HeroUIRadio.Content> : null}
    </HeroUIRadio>
  );
}

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Root: RadioGroupRoot,
  Item: RadioGroupItem,
});
