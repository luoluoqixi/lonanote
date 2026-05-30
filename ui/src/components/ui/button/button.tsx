import { type ComponentRef, type ComponentType, forwardRef } from "react";
import { Button as TamaguiButton } from "tamagui";

import { isWeb } from "@/api/common/platform";
import { triggerNativeHaptics } from "@/components/ui/utils";

import type { ButtonProps } from "./types";

const DISABLED_LONG_PRESS_DELAY = 2_147_483_647;
const TamaguiButtonWithLongPressDelay = TamaguiButton as unknown as ComponentType<
  ButtonProps & { ref?: React.Ref<ComponentRef<typeof TamaguiButton>> }
>;

const DISABLED_BUTTON_OPACITY = 0.5;
const ENABLED_BUTTON_OPACITY = 1;

export const Button = forwardRef<ComponentRef<typeof TamaguiButton>, ButtonProps>((props, ref) => {
  const { delayLongPress, nativeHaptics, onPress, ...buttonProps } = props;
  const resolvedDelayLongPress =
    delayLongPress ?? (props.onLongPress == null ? DISABLED_LONG_PRESS_DELAY : undefined);
  const handlePress: NonNullable<ButtonProps["onPress"]> = (event) => {
    onPress?.(event);

    if (event.defaultPrevented) {
      return;
    }

    triggerNativeHaptics(nativeHaptics);
  };

  const resolvedOpacity = buttonProps.disabled ? DISABLED_BUTTON_OPACITY : ENABLED_BUTTON_OPACITY;

  if (isWeb()) {
    return (
      <TamaguiButton opacity={resolvedOpacity} {...buttonProps} onPress={handlePress} ref={ref} />
    );
  }

  return (
    <TamaguiButtonWithLongPressDelay
      opacity={resolvedOpacity}
      {...buttonProps}
      delayLongPress={resolvedDelayLongPress}
      onPress={handlePress}
      ref={ref}
    />
  );
});
