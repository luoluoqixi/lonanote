import { useState } from "react";

import { Button } from "../button";
import type { ToggleButtonProps } from "./types";

export function ToggleButton(props: ToggleButtonProps) {
  const { defaultSelected = false, isSelected, onValueChange, ...rest } = props;

  const [uncontrolledSelected, setUncontrolledSelected] = useState(defaultSelected);
  const selected = isSelected ?? uncontrolledSelected;

  return (
    <Button
      onPress={() => {
        const nextValue = !selected;

        if (isSelected == null) {
          setUncontrolledSelected(nextValue);
        }

        onValueChange?.(nextValue);
      }}
      variant={selected ? "secondary" : "ghost"}
      {...rest}
    />
  );
}
