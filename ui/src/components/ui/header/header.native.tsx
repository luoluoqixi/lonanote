import { Text } from "react-native";

import type { HeaderProps } from "./types";

export function Header({ children, className, nativeProps, webProps }: HeaderProps) {
  void webProps;
  return (
    <Text className={className} {...(nativeProps as any)}>
      {children}
    </Text>
  );
}
