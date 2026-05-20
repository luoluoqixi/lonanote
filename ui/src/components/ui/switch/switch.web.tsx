import { Switch as HeroUISwitch } from "@heroui/react";
import clsx from "clsx";

import type { SwitchProps } from "./types";

export function Switch({
  accessibilityLabel,
  className,
  isDisabled,
  nativeProps,
  onValueChange,
  value,
  webProps,
}: SwitchProps) {
  void nativeProps;
  return (
    <HeroUISwitch
      aria-label={accessibilityLabel}
      className={clsx("h-7 w-12", className)}
      isDisabled={isDisabled}
      isSelected={value}
      onChange={onValueChange}
      {...(webProps as any)}
    />
  );
}
