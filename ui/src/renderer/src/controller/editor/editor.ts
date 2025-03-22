import { FileNode } from '@/bindings/api';
import { EditorState, useEditorStore } from '@/models/editor';

export const useEditor = useEditorStore;

export const setCurrentEditFileNode = async (currentEditFileNode: FileNode | null) => {
  useEditorStore.setState((state) => ({ ...state, currentEditFileNode }));
};

export const setCurrentEditorState = async (currentEditorStatus: EditorState | null) => {
  useEditorStore.setState((state) => ({ ...state, currentEditorStatus }));
};
