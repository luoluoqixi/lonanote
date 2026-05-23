import { Description as HeroUIDescription } from "@heroui/react";

import type { DescriptionProps } from "./types";

export function Description({
  children,
  className,
  hideOnInvalid,
  isDisabled,
  isInvalid,
  nativeProps,
  webProps,
}: DescriptionProps) {
  void hideOnInvalid;
  void isDisabled;
  void isInvalid;
  void nativeProps;

  return (
    <HeroUIDescription className={className} {...(webProps as any)}>
      {children}
    </HeroUIDescription>
  );
}
