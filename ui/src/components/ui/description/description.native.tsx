import { Description as HeroUIDescription } from "heroui-native";

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
  void webProps;

  return (
    <HeroUIDescription
      className={className}
      hideOnInvalid={hideOnInvalid}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      {...(nativeProps as any)}
    >
      {children}
    </HeroUIDescription>
  );
}
