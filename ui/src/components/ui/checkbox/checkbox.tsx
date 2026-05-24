import { Check } from "@tamagui/lucide-icons-2";
import { useId } from "react";
import { Checkbox as TamaguiCheckbox, Label as TamaguiLabel, XStack } from "tamagui";

import type { CheckboxIndicatorProps, CheckboxProps } from "./types";

function CheckboxRoot(props: CheckboxProps) {
  const generatedId = useId();
  const { children, id, indicatorProps, label, labelProps, ...rootProps } = props;
  const controlId = id ?? generatedId;
  const checkbox = (
    <TamaguiCheckbox {...rootProps} id={controlId}>
      {children ?? <CheckboxIndicator {...indicatorProps} />}
    </TamaguiCheckbox>
  );

  if (label == null) {
    return checkbox;
  }

  return (
    <XStack gap="$2" style={{ alignItems: "center" }}>
      {checkbox}
      <TamaguiLabel {...labelProps} htmlFor={labelProps?.htmlFor ?? controlId}>
        {label}
      </TamaguiLabel>
    </XStack>
  );
}

function CheckboxIndicator(props: CheckboxIndicatorProps) {
  const { children, ...indicatorProps } = props;

  return (
    <TamaguiCheckbox.Indicator {...indicatorProps}>
      {children ?? <Check />}
    </TamaguiCheckbox.Indicator>
  );
}

export const Checkbox = Object.assign(CheckboxRoot, {
  Indicator: CheckboxIndicator,
});
