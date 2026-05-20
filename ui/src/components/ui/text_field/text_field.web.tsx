import { TextField as HeroUITextField } from "@heroui/react";

import type { TextFieldProps } from "./types";

export function TextField({
  children,
  className,
  isDisabled,
  isInvalid,
  isRequired,
  nativeProps,
  webProps,
}: TextFieldProps) {
  void nativeProps;
  return (
    <HeroUITextField
      className={className}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      {...(webProps as any)}
    >
      {children}
    </HeroUITextField>
  );
}
