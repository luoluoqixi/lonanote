import { Input as TamaguiInput } from "tamagui";

import type { InputProps } from "./types";

export function Input(props: InputProps) {
  return <TamaguiInput {...props} />;
}
