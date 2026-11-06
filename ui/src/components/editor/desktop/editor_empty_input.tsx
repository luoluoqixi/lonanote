import { type ReactNode, useRef } from "react";
import { Pressable } from "react-native";

import { createEditorTabBlankPressDetector } from "./editor_tab_blank_press";

export function EditorEmptyInput({
  children,
  disabled,
  onCreateNote,
}: {
  children: ReactNode;
  disabled: boolean;
  onCreateNote: () => void;
}) {
  const detect = useRef(createEditorTabBlankPressDetector());
  return (
    <Pressable
      accessible={false}
      disabled={disabled}
      style={{ flex: 1, minHeight: 0, width: "100%" }}
      onPress={(event) => {
        const { pageX, pageY } = event.nativeEvent;
        if (detect.current(Date.now(), pageX, pageY)) onCreateNote();
      }}
    >
      {children}
    </Pressable>
  );
}
