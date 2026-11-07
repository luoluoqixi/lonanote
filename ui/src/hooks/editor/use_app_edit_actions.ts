import { useRef } from "react";

import { clipboard } from "@/api/commands/system/clipboard";
import type { EditorCommand } from "@/assets/editor/src/bridge/protocol";
import { editorCommandCoordinator } from "@/components/editor/controllers";
import { executeEditorMenuAction } from "@/components/editor/desktop/editor_menu_actions";
import { editorStore } from "@/stores/editor";

import { useEditorSelector } from "./use_editor_selector";
import { type TextMenuAction, useTextMenuTarget } from "./use_text_menu_target";

const commands: Partial<Record<TextMenuAction, EditorCommand>> = {
  undo: { type: "history.undo" },
  redo: { type: "history.redo" },
  selectAll: { type: "selection.selectAll" },
};

export function useAppEditActions() {
  const target = useEditorSelector((state) => {
    const view = state.activeEditorId ? state.editorsById[state.activeEditorId] : null;
    const doc = view && state.documentsById[view.documentId];
    return {
      activeEditorId: state.activeEditorId,
      documentId: view?.documentId,
      ready: doc?.loadState === "ready" && view?.bridgeState === "ready",
      writable:
        !!view && !view.readOnly && !view.previewMode && doc?.editOwnerEditorId === view.editorId,
      focused: view?.editorState.focused,
      canUndo: view?.editorState.canUndo,
      canRedo: view?.editorState.canRedo,
      selectionEmpty: view?.editorState.selectionEmpty,
    };
  });
  const { activeEditorId } = target;
  const getSnapshot = editorStore.getState;
  const textTarget = useTextMenuTarget();
  const lastFocused = useRef<string | null>(null);
  if (lastFocused.current !== activeEditorId) lastFocused.current = null;
  const available = Boolean(
    !textTarget.active &&
    activeEditorId &&
    target.ready &&
    (target.focused || lastFocused.current === activeEditorId),
  );
  const writable = available && target.writable;
  const enabled = {
    undo: textTarget.active ? textTarget.writable : Boolean(writable && target.canUndo),
    redo: textTarget.active ? textTarget.writable : Boolean(writable && target.canRedo),
    cut: textTarget.active
      ? textTarget.writable && textTarget.selected
      : Boolean(writable && !target.selectionEmpty),
    copy: textTarget.active ? textTarget.selected : Boolean(available && !target.selectionEmpty),
    paste: textTarget.active ? textTarget.writable : Boolean(writable),
    selectAll: textTarget.active ? textTarget.selectable : available,
  };
  return {
    enabled,
    captureTarget: () => {
      lastFocused.current = !textTarget.isActive() && target.focused ? activeEditorId : null;
    },
    execute: async (action: TextMenuAction) => {
      if (!enabled[action]) return;
      if (textTarget.isActive()) {
        await textTarget.execute(action);
        return;
      }
      const id = activeEditorId;
      if (!id || getSnapshot().activeEditorId !== id) return;
      const documentId = target.documentId;
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
