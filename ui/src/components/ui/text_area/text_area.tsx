import { TextArea as TamaguiTextArea } from "tamagui";

import type { TextAreaProps } from "./types";

export function TextArea(props: TextAreaProps) {
  return <TamaguiTextArea {...props} />;
}
