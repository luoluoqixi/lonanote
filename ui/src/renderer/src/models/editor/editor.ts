import { create } from 'zustand';

import { FileNode } from '@/bindings/api';

export interface EditorStore {
  currentEditFileNode: FileNode | null;
}

export const useEditorStore = create<EditorStore>(() => ({
  currentEditFileNode: null,
}));
