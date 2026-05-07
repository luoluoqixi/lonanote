import { useStore } from "zustand";

import { workspaceEditorStore } from "@/stores/workspace";

type OpenNoteEditorOptions = {
  duplicate?: boolean;
};

export function useWorkspaceEditorSession(workspaceId: string) {
  const store = workspaceEditorStore.getStore(workspaceId);
  const state = useStore(store);

  return {
    ...state,
    getDefaultEditorId: () => store.getState().getDefaultEditorId(),
    openNoteEditor: (noteId: string, options?: OpenNoteEditorOptions) =>
      store.getState().openNoteEditor(noteId, options),
  };
}
