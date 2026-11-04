import { useRef } from "react";

import { clipboard } from "@/api/commands/system/clipboard";
import type { EditorCommand } from "@/assets/editor/src/bridge/protocol";
import { editorCommandCoordinator } from "@/components/editor/controllers";
import { executeEditorMenuAction } from "@/components/editor/desktop/editor_menu_actions";

import { useEditorSession } from "./use_editor_session";
import { type TextMenuAction, useTextMenuTarget } from "./use_text_menu_target";

const commands: Partial<Record<TextMenuAction, EditorCommand>> = {
  undo: { type: "history.undo" },
  redo: { type: "history.redo" },
  selectAll: { type: "selection.selectAll" },
};

export function useAppEditActions() {
  const { activeEditorId, editorsById, documentsById, getSnapshot } = useEditorSession();
  const textTarget = useTextMenuTarget();
  const view = activeEditorId ? editorsById[activeEditorId] : null;
  const doc = view && documentsById[view.documentId];
  const lastFocused = useRef<string | null>(null);
  if (lastFocused.current !== activeEditorId) lastFocused.current = null;
  const available = Boolean(
    !textTarget.active &&
    view &&
    doc?.loadState === "ready" &&
    view.bridgeState === "ready" &&
    (view.editorState.focused || lastFocused.current === view.editorId),
  );
  const writable =
    available && !view?.readOnly && !view?.previewMode && doc?.editOwnerEditorId === view?.editorId;
  const enabled = {
    undo: textTarget.active ? textTarget.writable : Boolean(writable && view?.editorState.canUndo),
    redo: textTarget.active ? textTarget.writable : Boolean(writable && view?.editorState.canRedo),
    cut: textTarget.active
      ? textTarget.writable && textTarget.selected
      : Boolean(writable && !view?.editorState.selectionEmpty),
    copy: textTarget.active
      ? textTarget.selected
      : Boolean(available && !view?.editorState.selectionEmpty),
    paste: textTarget.active ? textTarget.writable : Boolean(writable),
    selectAll: textTarget.active ? textTarget.selectable : available,
  };
  return {
    enabled,
    captureTarget: () => {
      lastFocused.current =
        !textTarget.isActive() && view?.editorState.focused ? view.editorId : null;
    },
    execute: async (action: TextMenuAction) => {
      if (!enabled[action]) return;
      if (textTarget.isActive()) {
        await textTarget.execute(action);
        return;
      }
      const id = activeEditorId;
      if (!id || getSnapshot().activeEditorId !== id) return;
      const documentId = view?.documentId;
      const capture = await editorCommandCoordinator.execute(id, { type: "selection.capture" });
      const snapshot = capture.selection;
      if (!snapshot) return;
      const isCurrent = () =>
        getSnapshot().activeEditorId === id &&
        getSnapshot().editorsById[id]?.documentId === documentId;
      await executeEditorMenuAction(commands[action] ?? (action as "copy" | "cut" | "paste"), {
        text: snapshot.text,
        clipboard,
        isCurrent,
        execute: (command) => editorCommandCoordinator.execute(id, command, snapshot),
      });
      if (isCurrent())
        await editorCommandCoordinator.execute(id, {
          type: "editor.focus",
          preserveSelection: true,
        });
    },
  };
}
