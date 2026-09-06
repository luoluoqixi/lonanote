import { useStore } from "zustand";

import { editorStore } from "@/stores/editor";

export function useEditorView(editorId: string) {
  return useStore(editorStore, (state) => state.editorsById[editorId] ?? null);
}
