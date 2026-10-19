import { View } from "react-native";

import type { TreeInputProps } from "./tree_input_props";

export function TreeInput({ children }: TreeInputProps) {
  return <View style={{ flex: 1, minHeight: 0 }}>{children}</View>;
}
