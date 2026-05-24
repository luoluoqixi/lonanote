import { Children, isValidElement } from "react";
import { SizableText, Avatar as TamaguiAvatar } from "tamagui";

import type { AvatarFallbackProps, AvatarImageProps, AvatarProps } from "./types";

function normalizeAvatarChildren(children: React.ReactNode) {
  return Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return <SizableText>{child}</SizableText>;
    }

    if (isValidElement(child)) {
      return child;
    }

    return child;
  });
}

function AvatarRoot(props: AvatarProps) {
  const { alt, children, circular, fallback, fallbackProps, imageProps, src, ...rootProps } = props;
  const shouldRenderFallback = fallback != null || fallbackProps != null || src != null;
  const resolvedFallbackProps = shouldRenderFallback
    ? {
        ...fallbackProps,
        bg: fallbackProps?.bg ?? "$gray10",
        delayMs: src ? (fallbackProps?.delayMs ?? 600) : fallbackProps?.delayMs,
      }
    : undefined;

  return (
    <TamaguiAvatar {...rootProps} circular={circular ?? true}>
      {children ?? (
        <>
          {src ? (
            <AvatarImage {...imageProps} aria-label={imageProps?.["aria-label"] ?? alt} src={src} />
          ) : null}
          {shouldRenderFallback ? (
            <AvatarFallback items="center" justify="center" {...resolvedFallbackProps}>
              {fallback}
            </AvatarFallback>
          ) : null}
        </>
      )}
    </TamaguiAvatar>
  );
}

function AvatarImage(props: AvatarImageProps) {
  return <TamaguiAvatar.Image {...props} />;
}

function AvatarFallback(props: AvatarFallbackProps) {
  const { children, ...fallbackProps } = props;

  return (
    <TamaguiAvatar.Fallback {...fallbackProps}>
      {normalizeAvatarChildren(children)}
    </TamaguiAvatar.Fallback>
  );
}

export const Avatar = Object.assign(AvatarRoot, {
  Image: AvatarImage,
  Fallback: AvatarFallback,
});
