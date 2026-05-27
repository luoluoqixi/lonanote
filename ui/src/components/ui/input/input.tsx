import { StyleSheet } from "react-native";
import { Input as TamaguiInput } from "tamagui";

import { os } from "@/api/common/platform";

import type { InputProps } from "./types";

export function Input(props: InputProps) {
  const resolvedStyle =
    os() === "android" && props.multiline !== true
      ? [styles.androidSingleLineInput, props.style]
      : props.style;

  return <TamaguiInput {...props} style={resolvedStyle} />;
}

const styles = StyleSheet.create({
  androidSingleLineInput: {
    includeFontPadding: false,
    paddingVertical: 0,
    textAlignVertical: "center",
  },
});
