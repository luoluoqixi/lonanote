import { Label as TamaguiLabel, Switch as TamaguiSwitch, XStack } from "tamagui";

import type { SwitchProps, SwitchThumbProps } from "./types";

function SwitchRoot(props: SwitchProps) {
  const { children, label, labelPosition = "end", labelProps, thumbProps, ...rootProps } = props;
  const control = (
    <TamaguiSwitch {...rootProps}>{children ?? <SwitchThumb {...thumbProps} />}</TamaguiSwitch>
  );

  if (label == null) {
    return control;
  }

  const labelElement = <TamaguiLabel {...labelProps}>{label}</TamaguiLabel>;

  return (
    <XStack gap="$2" style={{ alignItems: "center" }}>
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
