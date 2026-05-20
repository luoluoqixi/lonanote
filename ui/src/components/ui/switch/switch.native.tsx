import clsx from "clsx";
import { Switch as HeroUISwitch } from "heroui-native";

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
  void webProps;
  return (
    <HeroUISwitch
      accessibilityLabel={accessibilityLabel}
      className={clsx("h-7 w-12", className)}
      isDisabled={isDisabled}
      isSelected={value}
      onSelectedChange={onValueChange}
      {...(nativeProps as any)}
    />
  );
}
