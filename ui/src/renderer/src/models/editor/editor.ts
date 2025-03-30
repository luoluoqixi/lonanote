import { create } from 'zustand';

export type EditorMode = 'edit' | 'preview';
export type EditorEditMode = 'ir' | 'sv';

export const defaultEditorMode: EditorMode = 'edit';
export const defaultEditorEditMode: EditorEditMode = 'ir';

export interface EditorStore {
  currentEditorStatus: EditorState | null;
  editorMode?: EditorMode;
  editorEditMode?: EditorEditMode;
}

export interface EditorState {
  charCount: number;
  rowIndex?: number;
  colIndex?: number;
}

export const useEditorStore = create<EditorStore>(() => ({
  currentEditorStatus: null,
  editorMode: undefined,
}));
