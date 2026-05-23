import { Label as HeroUILabel } from "heroui-native";

import type { LabelProps } from "./types";

export function Label({
  children,
  className,
  htmlFor,
  isDisabled,
  isInvalid,
  isRequired,
  nativeProps,
  webProps,
}: LabelProps) {
  void htmlFor;
  void webProps;
  return (
    <HeroUILabel
      className={className}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      {...(nativeProps as any)}
    >
      {children}
    </HeroUILabel>
  );
}
