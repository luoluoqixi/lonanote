import { create } from 'zustand';

export interface EditorStore {
  currentEditorStatus: EditorState | null;
}

export interface EditorState {
  charCount: number;
  rowIndex: number;
  colIndex: number;
}

export const useEditorStore = create<EditorStore>(() => ({
  currentEditorStatus: null,
}));
