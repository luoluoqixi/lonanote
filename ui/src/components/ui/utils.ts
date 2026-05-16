import { CSSProperties } from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";

export function toCSSProperties(style?: StyleProp<ViewStyle>): CSSProperties | undefined {
  const flattened = StyleSheet.flatten(style);
  if (!flattened) {
    return undefined;
  }

  return {
    width: flattened.width,
    height: flattened.height,
    minWidth: flattened.minWidth,
    minHeight: flattened.minHeight,
    maxWidth: flattened.maxWidth,
    maxHeight: flattened.maxHeight,
    overflow: flattened.overflow,
  };
}
