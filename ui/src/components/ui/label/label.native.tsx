import { Label as HeroUILabel } from "heroui-native";

import type { LabelProps } from "./types";

export function Label({ children, className, isDisabled, isInvalid, isRequired }: LabelProps) {
  return (
    <HeroUILabel
      className={className}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
    >
      {children}
    </HeroUILabel>
  );
}
