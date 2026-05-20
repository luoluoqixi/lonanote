import { RadioGroup as HeroUIRadioGroup } from "heroui-native";

import type { RadioGroupProps } from "./types";

function RadioGroupRoot({ children, className, nativeProps, variant, webProps }: RadioGroupProps) {
  void webProps;
  return (
    <HeroUIRadioGroup className={className} variant={variant} {...(nativeProps as any)}>
      {children}
    </HeroUIRadioGroup>
  );
}

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Root: RadioGroupRoot,
});
