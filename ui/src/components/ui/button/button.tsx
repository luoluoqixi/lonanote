import { Button as TamaguiButton } from "tamagui";

import type { ButtonProps } from "./types";

export function Button(props: ButtonProps) {
  return <TamaguiButton {...props} />;
}
