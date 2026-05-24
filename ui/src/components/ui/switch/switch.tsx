import { useId } from "react";
import { Label as TamaguiLabel, Switch as TamaguiSwitch, XStack } from "tamagui";

import type { SwitchProps, SwitchThumbProps } from "./types";

function SwitchRoot(props: SwitchProps) {
  const generatedId = useId();
  const {
    children,
    id,
    label,
    labelPosition = "start",
    labelProps,
    overflow,
    size = "$4",
    thumbProps,
    ...rootProps
  } = props;
  const controlId = id ?? generatedId;
  const control = (
    <TamaguiSwitch
      activeStyle={{
        backgroundColor: "$color6",
      }}
      {...rootProps}
      borderWidth={rootProps.borderWidth ?? 0}
      cursor={rootProps.cursor ?? "pointer"}
      id={controlId}
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

  const labelElement = (
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
