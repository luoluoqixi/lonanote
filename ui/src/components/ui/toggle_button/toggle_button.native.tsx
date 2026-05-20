import { useState } from "react";

import { Button } from "../button";
import type { ToggleButtonProps } from "./types";

export function ToggleButton({
  accessibilityLabel,
  children,
  className,
  defaultSelected = false,
  isDisabled,
  isSelected,
  nativeProps,
  onValueChange,
  webProps,
}: ToggleButtonProps) {
  const [uncontrolledSelected, setUncontrolledSelected] = useState(defaultSelected);
  const selected = isSelected ?? uncontrolledSelected;

  void webProps;

  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      className={className}
      isDisabled={isDisabled}
      onPress={() => {
        const nextValue = !selected;

        if (isSelected == null) {
          setUncontrolledSelected(nextValue);
        }

        onValueChange?.(nextValue);
      }}
      variant={selected ? "secondary" : "ghost"}
      {...nativeProps}
    >
      {children}
    </Button>
  );
}
