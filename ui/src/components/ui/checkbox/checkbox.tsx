import { Check } from "@tamagui/lucide-icons-2";
import { useId, useState } from "react";
import { Checkbox as TamaguiCheckbox, Label as TamaguiLabel, XStack } from "tamagui";

import { os } from "@/api/common/platform";
import { triggerNativeHaptics } from "@/components/ui/utils";

import type { CheckboxIndicatorProps, CheckboxProps, CheckedState } from "./types";

function CheckboxRoot(props: CheckboxProps) {
  const generatedId = useId();
  const {
    checked: checkedProp,
    children,
    defaultChecked,
    id,
    indicatorProps,
    label,
    labelProps,
    nativeHaptics,
    onCheckedChange,
    ...rootProps
  } = props;
  const controlId = id ?? generatedId;
  const [uncontrolledChecked, setUncontrolledChecked] = useState<CheckedState>(
    defaultChecked ?? false,
  );
  const checked = checkedProp ?? uncontrolledChecked;
  const shouldHandleLabelPress = os() === "ios";

  const handleCheckedChange = (nextChecked: CheckedState) => {
    if (checkedProp === undefined) {
      setUncontrolledChecked(nextChecked);
    }

    onCheckedChange?.(nextChecked);
    triggerNativeHaptics(nativeHaptics);
  };

  const checkbox = (
    <TamaguiCheckbox
      {...rootProps}
      checked={checked}
      id={controlId}
      onCheckedChange={handleCheckedChange}
    >
      {children ?? <CheckboxIndicator {...indicatorProps} />}
    </TamaguiCheckbox>
  );

  if (label == null) {
    return checkbox;
  }

  const labelElement = shouldHandleLabelPress ? (
    <XStack
      onPress={(event) => {
        labelProps?.onPress?.(event);

        if (rootProps.disabled || event.defaultPrevented) {
          return;
        }

        handleCheckedChange(checked === "indeterminate" ? true : !checked);
      }}
    >
      <TamaguiLabel {...labelProps} pointerEvents="none">
        {label}
      </TamaguiLabel>
    </XStack>
  ) : (
    <TamaguiLabel {...labelProps} htmlFor={labelProps?.htmlFor ?? controlId}>
      {label}
    </TamaguiLabel>
  );

  return (
    <XStack gap="$2" style={{ alignItems: "center" }}>
      {checkbox}
      {labelElement}
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
