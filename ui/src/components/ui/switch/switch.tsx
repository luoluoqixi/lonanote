import { useId, useState } from "react";
import { Label as TamaguiLabel, Switch as TamaguiSwitch, XStack, YStack } from "tamagui";

import { isWeb, os, supportsImpactHaptics } from "@/api/common/platform";
import { triggerNativeHaptics, useResolvedNativeHaptics } from "@/components/ui/utils";

import type { SwitchProps, SwitchThumbProps } from "./types";

const platform = os();
const web = isWeb();
const ios = platform === "ios";

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
    native = !web,
    nativeHaptics = true,
    onCheckedChange,
    overflow,
    size = "$4",
    thumbProps,
    ...rootProps
  } = props;

  const resolvedNativeHaptics = useResolvedNativeHaptics(nativeHaptics);
  const controlId = id ?? generatedId;
  const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked ?? false);
  const checked = checkedProp ?? uncontrolledChecked;
  const shouldHandleLabelPress = ios;

  // iOS 原生 UISwitch 作为 flex container 直接子节点时无法正确垂直居中，
  // 套一层 YStack 容器让 flexbox 对齐机制正常工作

  const handleCheckedChange = (nextChecked: boolean, isLabel?: boolean) => {
    if (checkedProp === undefined) {
      setUncontrolledChecked(nextChecked);
    }

    onCheckedChange?.(nextChecked);

    const iosDefaultHaptics = native && ios && supportsImpactHaptics();
    if (!iosDefaultHaptics || isLabel) {
      // ios 中, 原生 Switch 交互默认是有震动的 (除了iPhone6s或以下, 可能是封装原生Switch 的库用的不支持 iPhone6s 的震动api)
      // 所以 ios 原生 Switch 不需要自己调用震动 api.
      triggerNativeHaptics(resolvedNativeHaptics);
    }
  };

  const control = (
    <TamaguiSwitch
      native={native}
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

  // iOS 原生 UISwitch 作为 flex container 直接子节点时无法正确垂直居中，
  // 套一层 YStack 容器让 flexbox 对齐机制正常工作
  const wrappedControl = ios && native ? <YStack>{control}</YStack> : control;

  if (label == null) {
    return wrappedControl;
  }

  const labelElement = shouldHandleLabelPress ? (
    <XStack
      onPress={(event) => {
        labelProps?.onPress?.(event);

        if (rootProps.disabled || event.defaultPrevented) {
          return;
        }

        handleCheckedChange(!checked, true);
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
      {wrappedControl}
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
