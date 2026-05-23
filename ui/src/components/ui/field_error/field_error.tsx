import { FieldError as HeroUIFieldError } from "heroui-native";

import type { FieldErrorProps } from "./types";

export function FieldError({ children, className, isInvalid }: FieldErrorProps) {
  return (
    <HeroUIFieldError className={className} isInvalid={isInvalid}>
      {children}
    </HeroUIFieldError>
  );
}
