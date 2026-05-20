import { ScrollShadow as HeroUIScrollShadow } from "heroui-native";

import type { ScrollShadowProps } from "./types";

function ScrollShadowRoot({
  children,
  className,
  hideScrollBar,
  isEnabled,
  nativeProps,
  offset,
  onVisibilityChange,
  orientation,
  size,
  variant,
  visibility,
  webProps,
}: ScrollShadowProps) {
  void webProps;
  void hideScrollBar;
  return (
    <HeroUIScrollShadow
      className={className}
      isEnabled={isEnabled}
      offset={offset}
      onVisibilityChange={onVisibilityChange}
      orientation={orientation}
      size={size}
      variant={variant}
      visibility={visibility}
      {...(nativeProps as any)}
    >
      {children}
    </HeroUIScrollShadow>
  );
}

export const ScrollShadow = Object.assign(ScrollShadowRoot, {
  Root: ScrollShadowRoot,
});
