import { type ComponentRef, forwardRef } from "react";
import { Anchor as TamaguiAnchor } from "tamagui";

import type { LinkProps } from "./types";

const DEFAULT_LINK_HOVER_STYLE = {
  opacity: 0.8,
  textDecorationColor: "$color10",
} as const;

const DEFAULT_LINK_PRESS_STYLE = {
  opacity: 0.5,
  textDecorationColor: "$color10",
} as const;

const DEFAULT_LINK_FOCUS_VISIBLE_STYLE = {
  outlineColor: "$outlineColor",
  outlineStyle: "solid",
  outlineWidth: 2,
} as const;

export const Link = forwardRef<ComponentRef<typeof TamaguiAnchor>, LinkProps>((props, ref) => {
  const { focusVisibleStyle, hoverStyle, pressStyle, textDecorationColor, ...linkProps } = props;

  return (
    <TamaguiAnchor
      {...linkProps}
      ref={ref}
      focusVisibleStyle={{
        ...DEFAULT_LINK_FOCUS_VISIBLE_STYLE,
        ...focusVisibleStyle,
      }}
      hoverStyle={{
        ...DEFAULT_LINK_HOVER_STYLE,
        ...hoverStyle,
      }}
      pressStyle={{
        ...DEFAULT_LINK_PRESS_STYLE,
        ...pressStyle,
      }}
      textDecorationColor={textDecorationColor ?? "$color8"}
      textDecorationLine={linkProps.textDecorationLine ?? "underline"}
    />
  );
});

Link.displayName = "Link";
