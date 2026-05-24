import { Avatar as TamaguiAvatar } from "tamagui";

import type { AvatarFallbackProps, AvatarImageProps, AvatarProps } from "./types";

function AvatarRoot(props: AvatarProps) {
  const { alt, children, fallback, fallbackProps, imageProps, src, ...rootProps } = props;

  return (
    <TamaguiAvatar {...rootProps}>
      {children ?? (
        <>
          {src ? <AvatarImage {...imageProps} accessibilityLabel={alt} src={src} /> : null}
          {fallback != null ? <AvatarFallback {...fallbackProps}>{fallback}</AvatarFallback> : null}
        </>
      )}
    </TamaguiAvatar>
  );
}

function AvatarImage(props: AvatarImageProps) {
  return <TamaguiAvatar.Image {...props} />;
}

function AvatarFallback(props: AvatarFallbackProps) {
  return <TamaguiAvatar.Fallback {...props} />;
}

export const Avatar = Object.assign(AvatarRoot, {
  Image: AvatarImage,
  Fallback: AvatarFallback,
});
