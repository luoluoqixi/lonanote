import { type ComponentRef, type ComponentType, forwardRef } from "react";
import { Button as TamaguiButton } from "tamagui";

import type { ButtonProps } from "./types";

const DISABLED_LONG_PRESS_DELAY = 2_147_483_647;
const TamaguiButtonWithLongPressDelay = TamaguiButton as unknown as ComponentType<
  ButtonProps & { ref?: React.Ref<ComponentRef<typeof TamaguiButton>> }
>;

export const Button = forwardRef<ComponentRef<typeof TamaguiButton>, ButtonProps>((props, ref) => {
  const resolvedDelayLongPress =
    props.delayLongPress ?? (props.onLongPress == null ? DISABLED_LONG_PRESS_DELAY : undefined);

  return (
    <TamaguiButtonWithLongPressDelay {...props} delayLongPress={resolvedDelayLongPress} ref={ref} />
  );
});
