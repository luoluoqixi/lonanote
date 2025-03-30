import {
  EditorEditMode,
  EditorMode,
  EditorState,
  defaultEditorMode,
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

export const setEditorMode = async (editorMode: EditorMode) => {
  useEditorStore.setState((state) => ({ ...state, editorMode }));
};

export const setEditorEditMode = async (editorEditMode: EditorEditMode) => {
  useEditorStore.setState((state) => ({ ...state, editorEditMode }));
};

export { defaultEditorMode };
