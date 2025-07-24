import { create } from 'zustand';

import { EditorMode, EditorState } from '@/components/editor/types';
import { globalLocalStorage } from '@/utils/storage';

export interface EditorStore {
  currentEditorStatus: EditorState | null;
  currentEditorContent?: string | null;
  currentEditorIsDirty?: boolean;
  nowSaved?: boolean;
  editorIsReadOnly?: boolean;
  editorMode?: EditorMode;
}

const editorModeSaveKey = 'editor-mode';

export const saveEditorMode = (mode: EditorMode) => {
  globalLocalStorage.set(editorModeSaveKey, mode);
};
const getSaveEditorMode = (): EditorMode | undefined => {
  return globalLocalStorage.get(editorModeSaveKey);
};

export const useEditorStore = create<EditorStore>(() => ({
  currentEditorStatus: null,
  editorIsReadOnly: undefined,
  editorMode: getSaveEditorMode(),
}));
