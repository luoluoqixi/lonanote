import { useStore } from "zustand";

import { type EditorDocumentRef, editorStore } from "@/stores/editor";

export function useEditorSession() {
  const state = useStore(editorStore);

  return {
    getSnapshot: editorStore.getState,
    groupsById: state.groupsById,
    layout: state.layout,
    activeGroupId: state.activeGroupId,
    setActiveGroup: state.setActiveGroup,
    splitEditor: state.splitEditor,
    moveEditorToGroup: state.moveEditorToGroup,
    duplicateEditor: state.duplicateEditor,
    setSplitRatio: state.setSplitRatio,
    viewersById: state.viewersById,
    getDocument: (id: string) => editorStore.getState().documentsById[id],
    closeWorkspaceViewers: state.closeWorkspaceViewers,
    openViewer: state.openViewer,
    activeEditorId: state.activeEditorId,
    editorsById: state.editorsById,
    openEditorIds: state.openEditorIds,
    moveEditor: state.moveEditor,
    documentsById: state.documentsById,
    openEditor: (ref: EditorDocumentRef, options?: Parameters<typeof state.openEditor>[1]) =>
      editorStore.getState().openEditor(ref, options),
    closeEditor: (editorId: string) => editorStore.getState().closeEditor(editorId),
    discardDocumentDraft: (documentId: string) =>
      editorStore.getState().discardDocumentDraft(documentId),
    setActiveEditor: (editorId: string | null) => editorStore.getState().setActiveEditor(editorId),
    setEditorPreferenceOverrides: state.setEditorPreferenceOverrides,
  };
}
