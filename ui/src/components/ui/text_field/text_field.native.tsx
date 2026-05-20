import { TextField as HeroUITextField } from "heroui-native";

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
  void webProps;
  return (
    <HeroUITextField
      className={className}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      {...(nativeProps as any)}
    >
      {children}
    </HeroUITextField>
  );
}
