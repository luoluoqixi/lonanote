import { type ComponentRef, forwardRef, useState } from "react";
import { Linking } from "react-native";
import { Anchor as TamaguiAnchor, View } from "tamagui";

import { isWeb } from "@/api/common/platform";

import type { LinkProps } from "./types";

export const DEFAULT_LINK_HOVER_STYLE = {
  opacity: 0.8,
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
  const [pressed, setPressed] = useState(false);
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
    if (href != null) {
      void Linking.openURL(href);
    }
  };

  return (
    <View
      ref={ref as never}
      accessibilityRole="link"
      self="flex-start"
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      opacity={pressed ? resolvedPressStyle.opacity : 1}
    >
      <TamaguiAnchor
        {...linkProps}
        {...anchorStyleProps}
        pointerEvents="none"
        textDecorationColor={
          pressed
            ? (resolvedPressStyle.textDecorationColor ?? anchorStyleProps.textDecorationColor)
            : anchorStyleProps.textDecorationColor
        }
      />
    </View>
  );
});

Link.displayName = "Link";
