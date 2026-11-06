import type { ReactNode } from "react";

import { isEmptyEditorTarget } from "./editor_empty_target";

export function EditorEmptyInput({
  children,
  disabled,
  onCreateNote,
}: {
  children: ReactNode;
  disabled: boolean;
  onCreateNote: () => void;
}) {
  return (
    <div
      style={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0, width: "100%" }}
      onDoubleClick={(event) => {
        if (
          disabled ||
          event.button !== 0 ||
          !(event.target instanceof Element) ||
          !isEmptyEditorTarget(event.target)
        )
          return;
        event.preventDefault();
        onCreateNote();
      }}
    >
      {children}
    </div>
  );
}
