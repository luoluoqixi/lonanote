import clsx from "clsx";

import { Button } from "../button";
import type { IconButtonProps } from "./types";

export function IconButton({
  accessibilityLabel,
  children,
  className,
  isDisabled,
  onPress,
  size = "md",
  variant = "ghost",
}: IconButtonProps) {
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      className={clsx(className)}
      isDisabled={isDisabled}
      onPress={onPress}
      size={size}
      variant={variant}
      isIconOnly
    >
      {children}
    </Button>
  );
}
