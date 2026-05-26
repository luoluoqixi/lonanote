import { type ComponentRef, forwardRef } from "react";
import { Button as TamaguiButton } from "tamagui";

import type { ButtonProps } from "./types";

export const Button = forwardRef<ComponentRef<typeof TamaguiButton>, ButtonProps>((props, ref) => {
  return <TamaguiButton {...props} ref={ref} />;
});
