import { create } from 'zustand';

import { FileNode } from '@/bindings/api';

export interface EditorStore {
  currentEditFileNode: FileNode | null;
  currentEditorStatus: EditorState | null;
}

export interface EditorState {
  charCount: number;
  rowIndex: number;
  colIndex: number;
}

export const useEditorStore = create<EditorStore>(() => ({
  currentEditFileNode: null,
  currentEditorStatus: null,
}));
