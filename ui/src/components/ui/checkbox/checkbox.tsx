import { Checkbox as TamaguiCheckbox, Label as TamaguiLabel, XStack } from "tamagui";

import type { CheckboxIndicatorProps, CheckboxProps } from "./types";

function CheckboxRoot(props: CheckboxProps) {
  const { children, indicatorProps, label, labelProps, ...rootProps } = props;
  const checkbox = (
    <TamaguiCheckbox {...rootProps}>
      {children ?? <CheckboxIndicator {...indicatorProps} />}
    </TamaguiCheckbox>
  );

  if (label == null) {
    return checkbox;
  }

  return (
    <XStack gap="$2" style={{ alignItems: "center" }}>
      {checkbox}
      <TamaguiLabel {...labelProps}>{label}</TamaguiLabel>
    </XStack>
  );
}

function CheckboxIndicator(props: CheckboxIndicatorProps) {
  return <TamaguiCheckbox.Indicator {...props} />;
}

export const Checkbox = Object.assign(CheckboxRoot, {
  Indicator: CheckboxIndicator,
});
