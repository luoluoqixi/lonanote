import { useCallback, useMemo } from "react";

import { documentRegistry } from "@/components/editor/controllers";
import { editorStore } from "@/stores/editor";

type OpenNoteEditorOptions = {
  duplicate?: boolean;
};

export function useWorkspaceEditorSession(workspaceId: string) {
  const getDefaultEditorId = useCallback(() => {
    const state = editorStore.getState();
    for (const editorId of state.openEditorIds) {
      const editor = state.editorsById[editorId];
      const document = editor ? state.documentsById[editor.documentId] : null;
      if (document?.ref.kind === "workspaceFile" && document.ref.workspaceId === workspaceId) {
        return editorId;
      }
    }
    return null;
  }, [workspaceId]);

  const openNoteEditor = useCallback(
    (noteId: string, options?: OpenNoteEditorOptions) => {
      return documentRegistry.openEditor(
        {
          kind: "workspaceFile",
          workspaceId,
          filePath: noteId,
        },
        options,
      ).editorId;
    },
    [workspaceId],
  );

  return useMemo(
    () => ({ getDefaultEditorId, openNoteEditor }),
    [getDefaultEditorId, openNoteEditor],
  );
}
