import { FileNode } from '@/bindings/api';
import { EditorState, useEditorStore } from '@/models/editor';

export const useEditor = useEditorStore;

export const setCurrentEditFileNode = async (currentEditFileNode: FileNode | null) => {
  if (window.navigate) {
    const to = `/${currentEditFileNode ? encodeURIComponent(currentEditFileNode.path) : ''}`;
    window.navigate(to);
  }
};

export const setCurrentEditorState = async (currentEditorStatus: EditorState | null) => {
  useEditorStore.setState((state) => ({ ...state, currentEditorStatus }));
};
