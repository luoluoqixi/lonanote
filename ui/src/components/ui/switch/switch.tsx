import { useId, useState } from "react";
import { Label as TamaguiLabel, Switch as TamaguiSwitch, XStack } from "tamagui";

import { os } from "@/api/common/platform";
import { triggerNativeHaptics, useResolvedNativeHaptics } from "@/components/ui/utils";

import type { SwitchProps, SwitchThumbProps } from "./types";

function SwitchRoot(props: SwitchProps) {
  const generatedId = useId();
  const {
    checked: checkedProp,
    children,
    defaultChecked,
    id,
    label,
    labelPosition = "start",
    labelProps,
    nativeHaptics = true,
    onCheckedChange,
    overflow,
    size = "$4",
    thumbProps,
    ...rootProps
  } = props;
  const resolvedNativeHaptics = useResolvedNativeHaptics(nativeHaptics, { defaultEnabled: true });
  const controlId = id ?? generatedId;
  const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked ?? false);
  const checked = checkedProp ?? uncontrolledChecked;
  const shouldHandleLabelPress = os() === "ios";

  const handleCheckedChange = (nextChecked: boolean) => {
    if (checkedProp === undefined) {
      setUncontrolledChecked(nextChecked);
    }

    onCheckedChange?.(nextChecked);
    triggerNativeHaptics(resolvedNativeHaptics);
  };

  const control = (
    <TamaguiSwitch
      activeStyle={{
        backgroundColor: "$color6",
      }}
      {...rootProps}
      borderWidth={rootProps.borderWidth ?? 0}
      checked={checked}
      cursor={rootProps.cursor ?? "pointer"}
      id={controlId}
      onCheckedChange={handleCheckedChange}
      overflow={overflow ?? "hidden"}
      padding={rootProps.padding ?? 0}
      size={size}
    >
      {children ?? <SwitchThumb {...thumbProps} transition={thumbProps?.transition ?? "bouncy"} />}
    </TamaguiSwitch>
  );

  if (label == null) {
    return control;
  }

  const labelElement = shouldHandleLabelPress ? (
    <XStack
      onPress={(event) => {
        labelProps?.onPress?.(event);

        if (rootProps.disabled || event.defaultPrevented) {
          return;
        }

        handleCheckedChange(!checked);
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
    <XStack gap="$2" items="center">
      {labelPosition === "start" ? labelElement : null}
      {control}
      {labelPosition === "end" ? labelElement : null}
    </XStack>
  );
}

function SwitchThumb(props: SwitchThumbProps) {
  return <TamaguiSwitch.Thumb {...props} />;
}

export const Switch = Object.assign(SwitchRoot, {
  Thumb: SwitchThumb,
});
