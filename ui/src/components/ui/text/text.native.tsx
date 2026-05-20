import { Text as NativeText } from "react-native";

import type { TextProps } from "./types";

export function Text({ children, className, nativeProps, webProps }: TextProps) {
  void webProps;
  return (
    <NativeText className={className} {...(nativeProps as any)}>
      {children}
    </NativeText>
  );
}
