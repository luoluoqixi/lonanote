import { LinearGradient } from "expo-linear-gradient";
import { ScrollShadow as HeroUIScrollShadow } from "heroui-native";
import { isValidElement } from "react";

import type { ScrollShadowProps } from "./types";

function ScrollShadowRoot({
  children,
  className,
  hideScrollBar,
  isEnabled,
  offset,
  onVisibilityChange,
  orientation,
  size,
  variant,
  visibility,
}: ScrollShadowProps) {
  void hideScrollBar;
  void offset;
  void onVisibilityChange;
  void variant;

  if (!isValidElement(children)) {
    return null;
  }

  return (
    <HeroUIScrollShadow
      LinearGradientComponent={LinearGradient}
      className={className}
      isEnabled={isEnabled}
      orientation={orientation}
      size={size}
      visibility={visibility}
    >
      {children}
    </HeroUIScrollShadow>
  );
}

export const ScrollShadow = Object.assign(ScrollShadowRoot, {
  Root: ScrollShadowRoot,
});
