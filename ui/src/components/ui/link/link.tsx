import { openURL } from "expo-linking";
import { LinkButton as HeroUILinkButton } from "heroui-native";

import type { LinkProps } from "./types";

export function Link({
  accessibilityLabel,
  children,
  className,
  href,
  isDisabled,
  onPress,
}: LinkProps) {
  return (
    <HeroUILinkButton
      accessibilityLabel={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      onPress={(event) => {
        if (onPress) {
          return onPress(event);
        }

        if (href) {
          return openURL(href);
        }
      }}
    >
      {children}
    </HeroUILinkButton>
  );
}
