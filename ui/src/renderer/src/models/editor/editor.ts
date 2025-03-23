import { create } from 'zustand';

export type EditorMode = 'edit' | 'preview';

export const defaultEditorMode: EditorMode = 'edit';

export interface EditorStore {
  currentEditorStatus: EditorState | null;
  editorMode?: EditorMode;
}

export interface EditorState {
  charCount: number;
  rowIndex: number;
  colIndex: number;
}

export const useEditorStore = create<EditorStore>(() => ({
  currentEditorStatus: null,
  editorMode: undefined,
}));
