import { type ComponentRef, forwardRef } from "react";
import { Linking } from "react-native";
import { Anchor as TamaguiAnchor } from "tamagui";

import { isWeb } from "@/api/common/platform";

import type { LinkProps } from "./types";

export const DEFAULT_LINK_HOVER_STYLE = {
  opacity: isWeb() ? 0.6 : 0.8,
  textDecorationColor: "$color10",
} as const;

export const DEFAULT_LINK_PRESS_STYLE = {
  opacity: 0.5,
  textDecorationColor: "$color10",
} as const;

export const DEFAULT_LINK_FOCUS_VISIBLE_STYLE = {
  outlineColor: "$outlineColor",
  outlineStyle: "solid",
  outlineWidth: 2,
} as const;

export const Link = forwardRef<ComponentRef<typeof TamaguiAnchor>, LinkProps>((props, ref) => {
  const {
    focusVisibleStyle,
    hoverStyle,
    pressStyle,
    textDecorationColor,
    href,
    target,
    rel,
    onPress,
    ...linkProps
  } = props;

  const resolvedPressStyle = {
    ...DEFAULT_LINK_PRESS_STYLE,
    ...pressStyle,
  };

  const anchorStyleProps = {
    focusVisibleStyle: {
      ...DEFAULT_LINK_FOCUS_VISIBLE_STYLE,
      ...focusVisibleStyle,
    },
    textDecorationColor: textDecorationColor ?? "$color8",
    textDecorationLine: linkProps.textDecorationLine ?? "underline",
  } as const;

  if (isWeb()) {
    return (
      <TamaguiAnchor
        {...linkProps}
        href={href}
        target={target}
        rel={rel}
        ref={ref}
        {...anchorStyleProps}
        hoverStyle={{
          ...DEFAULT_LINK_HOVER_STYLE,
          ...hoverStyle,
        }}
        pressStyle={resolvedPressStyle}
      />
    );
  }

  const handlePress: NonNullable<LinkProps["onPress"]> = (event) => {
    onPress?.(event);

    if (event.defaultPrevented || href == null) {
      return;
    }

    if (href != null) {
      void Linking.openURL(href);
    }
  };

  return (
    <TamaguiAnchor
      {...linkProps}
      accessibilityRole="link"
      {...anchorStyleProps}
      onPress={handlePress}
      pressStyle={resolvedPressStyle}
      ref={ref}
      self="flex-start"
    />
  );
});

Link.displayName = "Link";
