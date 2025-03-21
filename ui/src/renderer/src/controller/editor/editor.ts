import { FileNode } from '@/bindings/api';
import { useEditorStore } from '@/models/editor';

export const useEditor = useEditorStore;

export const setCurrentEditFileNode = async (currentEditFileNode: FileNode | null) => {
  useEditorStore.setState((state) => ({ ...state, currentEditFileNode }));
};
