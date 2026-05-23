import { Text as NativeText } from "react-native";

import type { TextProps } from "./types";

export function Text({ children, className }: TextProps) {
  return <NativeText className={className}>{children}</NativeText>;
}
