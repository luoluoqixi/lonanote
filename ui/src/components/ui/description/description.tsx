import { Description as HeroUIDescription } from "heroui-native";

import type { DescriptionProps } from "./types";

export function Description({
  children,
  className,
  hideOnInvalid,
  isDisabled,
  isInvalid,
}: DescriptionProps) {
  return (
    <HeroUIDescription
      className={className}
      hideOnInvalid={hideOnInvalid}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
    >
      {children}
    </HeroUIDescription>
  );
}
