import { useRef } from "react";
import { Pressable, StyleSheet } from "react-native";

import { createEditorTabBlankPressDetector } from "./editor_tab_blank_press";

export function EditorTabBlankInput({
  area = "tabs",
  disabled,
  onCreateNote,
}: {
  area?: "tabs" | "editor";
  disabled: boolean;
  onCreateNote: () => void;
}) {
  const detect = useRef(createEditorTabBlankPressDetector());
  return (
    <Pressable
      accessible={false}
      disabled={disabled}
      style={[area === "editor" ? styles.editor : styles.tabs, styles.cursor]}
      onPress={(event) => {
        event.stopPropagation();
        const { pageX, pageY } = event.nativeEvent;
        if (detect.current(Date.now(), pageX, pageY)) onCreateNote();
      }}
    />
  );
}

const styles = StyleSheet.create({
  tabs: { flex: 1, minWidth: 32, height: 36 },
  editor: { ...StyleSheet.absoluteFillObject },
  cursor: { cursor: "auto" },
});
