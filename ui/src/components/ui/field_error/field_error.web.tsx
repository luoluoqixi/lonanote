import { FieldError as HeroUIFieldError } from "@heroui/react";

import type { FieldErrorProps } from "./types";

export function FieldError({
  children,
  className,
  isInvalid,
  nativeProps,
  webProps,
}: FieldErrorProps) {
  void isInvalid;
  void nativeProps;

  return (
    <HeroUIFieldError className={className} {...(webProps as any)}>
      {children}
    </HeroUIFieldError>
  );
}
