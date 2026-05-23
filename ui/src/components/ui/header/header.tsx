import { Text } from "react-native";

import type { HeaderProps } from "./types";

export function Header({ children, className }: HeaderProps) {
  return <Text className={className}>{children}</Text>;
}
