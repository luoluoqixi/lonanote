import { RadioGroup as HeroUIRadioGroup } from "@heroui/react";

import type { RadioGroupProps } from "./types";

function RadioGroupRoot({ children, className, nativeProps, variant, webProps }: RadioGroupProps) {
  void nativeProps;
  return (
    <HeroUIRadioGroup className={className} variant={variant} {...(webProps as any)}>
      {children}
    </HeroUIRadioGroup>
  );
}

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Root: RadioGroupRoot,
});
