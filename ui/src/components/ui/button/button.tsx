import { type ComponentRef, type ComponentType, forwardRef } from "react";
import { Button as TamaguiButton } from "tamagui";

import { isWeb } from "@/api/common/platform";

import type { ButtonProps } from "./types";

const DISABLED_LONG_PRESS_DELAY = 2_147_483_647;
const TamaguiButtonWithLongPressDelay = TamaguiButton as unknown as ComponentType<
  ButtonProps & { ref?: React.Ref<ComponentRef<typeof TamaguiButton>> }
>;

export const Button = forwardRef<ComponentRef<typeof TamaguiButton>, ButtonProps>((props, ref) => {
  const { delayLongPress, ...buttonProps } = props;
  const resolvedDelayLongPress =
    delayLongPress ?? (props.onLongPress == null ? DISABLED_LONG_PRESS_DELAY : undefined);

  if (isWeb()) {
    return <TamaguiButton {...buttonProps} ref={ref} />;
  }

  return (
    <TamaguiButtonWithLongPressDelay
      {...buttonProps}
      delayLongPress={resolvedDelayLongPress}
      ref={ref}
    />
  );
});
