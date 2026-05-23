import { ScrollShadow as HeroUIScrollShadow } from "@heroui/react";

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
  void nativeProps;
  return (
    <HeroUIScrollShadow
      className={className}
      hideScrollBar={hideScrollBar}
      isEnabled={isEnabled}
      offset={offset}
      onVisibilityChange={onVisibilityChange}
      orientation={orientation}
      size={size}
      variant={variant}
      visibility={visibility}
      {...(webProps as any)}
    >
      {children}
    </HeroUIScrollShadow>
  );
}

export const ScrollShadow = Object.assign(ScrollShadowRoot, {
  Root: ScrollShadowRoot,
});
