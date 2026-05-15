import clsx from "clsx";

import { Button } from "../button";
import type { IconButtonProps } from "./types";

const iconButtonSizeClassName: Record<NonNullable<IconButtonProps["size"]>, string> = {
  sm: "h-8 w-8 min-w-0 rounded-full px-0",
  md: "h-10 w-10 min-w-0 rounded-full px-0",
  lg: "h-12 w-12 min-w-0 rounded-full px-0",
};

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
      className={clsx(iconButtonSizeClassName[size], className)}
      isDisabled={isDisabled}
      onPress={onPress}
      size={size}
      variant={variant}
    >
      {children}
    </Button>
  );
}
