import { type ElementRef, forwardRef } from "react";
import { Button as TamaguiButton } from "tamagui";

import type { ButtonProps } from "./types";

export const Button = forwardRef<ElementRef<typeof TamaguiButton>, ButtonProps>((props, ref) => {
  return <TamaguiButton {...props} ref={ref} />;
});
