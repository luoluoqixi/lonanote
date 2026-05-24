import { Label as TamaguiLabel } from "tamagui";

import type { LabelProps } from "./types";

export function Label(props: LabelProps) {
  return <TamaguiLabel {...props} />;
}
