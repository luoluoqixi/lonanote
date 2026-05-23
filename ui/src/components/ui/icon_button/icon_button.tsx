import clsx from "clsx";

import { Button } from "../button";
import type { IconButtonProps } from "./types";

export function IconButton({
  accessibilityLabel,
  children,
  className,
  isDisabled,
  nativeProps,
  onPress,
  size = "md",
  variant = "ghost",
  webProps,
}: IconButtonProps) {
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      className={clsx(className)}
      isDisabled={isDisabled}
      nativeProps={nativeProps}
      onPress={onPress}
      size={size}
      variant={variant}
      webProps={webProps}
      isIconOnly
    >
      {children}
    </Button>
  );
}
