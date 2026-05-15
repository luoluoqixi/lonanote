import clsx from "clsx";
import { Switch as HeroUINativeSwitch } from "heroui-native";

import type { SwitchProps } from "./types";

export function Switch({
  accessibilityLabel,
  className,
  isDisabled,
  onValueChange,
  value,
}: SwitchProps) {
  return (
    <HeroUINativeSwitch
      accessibilityLabel={accessibilityLabel}
      className={clsx("h-7 w-12", className)}
      isDisabled={isDisabled}
      isSelected={value}
      onSelectedChange={onValueChange}
    />
  );
}
