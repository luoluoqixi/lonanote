import { FieldError as HeroUIFieldError } from "heroui-native";

import type { FieldErrorProps } from "./types";

export function FieldError({
  children,
  className,
  isInvalid,
  nativeProps,
  webProps,
}: FieldErrorProps) {
  void webProps;

  return (
    <HeroUIFieldError className={className} isInvalid={isInvalid} {...(nativeProps as any)}>
      {children}
    </HeroUIFieldError>
  );
}
