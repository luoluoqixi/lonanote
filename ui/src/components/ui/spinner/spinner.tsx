import { Spinner as TamaguiSpinner } from "tamagui";

import type { SpinnerProps } from "./types";

export function Spinner(props: SpinnerProps) {
  return <TamaguiSpinner {...props} />;
}
