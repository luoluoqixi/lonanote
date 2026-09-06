import { useStore } from "zustand";

import { editorStore } from "@/stores/editor";

export function useEditorDocument(documentId: string) {
  return useStore(editorStore, (state) => state.documentsById[documentId] ?? null);
}
