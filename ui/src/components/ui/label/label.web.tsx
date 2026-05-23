import { Label as HeroUILabel } from "@heroui/react";

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
  void nativeProps;
  return (
    <HeroUILabel
      className={className}
      htmlFor={htmlFor}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      {...(webProps as any)}
    >
      {children}
    </HeroUILabel>
  );
}
