/* eslint-disable indent */
import {
  EditorBackEnd,
  EditorMode,
  EditorState,
  defaultEditorBackEnd,
  defaultEditorIsReadOnly,
  defaultEditorMode,
  saveEditorBackEnd,
  saveEditorMode,
  useEditorStore,
} from '@/models/editor';

export const useEditor = useEditorStore;

export const setCurrentEditFile = async (
  currentEditFile: string | null,
  clearHistory?: boolean,
) => {
  if (window.navigate) {
    const to = `/${currentEditFile ? encodeURIComponent(currentEditFile) : ''}`;
    window.navigate(to);
    if (clearHistory) {
      history.replaceState({}, document.title, window.location.pathname);
    }
  }
};

export const setCurrentEditorState = async (currentEditorStatus: EditorState | null) => {
  useEditorStore.setState((state) => ({ ...state, currentEditorStatus }));
};

export const setCurrentEditorContent = async (currentEditorContent: string | null) => {
  useEditorStore.setState((state) => ({
    ...state,
    currentEditorContent:
      currentEditorContent != null
        ? {
            content: currentEditorContent,
          }
        : null,
  }));
};

export const setEditorIsReadOnly = async (editorIsReadOnly: boolean) => {
  useEditorStore.setState((state) => ({ ...state, editorIsReadOnly }));
};

export const setEditorMode = async (editorMode: EditorMode) => {
  useEditorStore.setState((state) => ({ ...state, editorMode }));
  saveEditorMode(editorMode);
};

export const setEditorBackEnd = async (editorBackEnd: EditorBackEnd) => {
  useEditorStore.setState((state) => ({ ...state, editorBackEnd }));
  saveEditorBackEnd(editorBackEnd);
};

export { defaultEditorMode, defaultEditorIsReadOnly, defaultEditorBackEnd };
