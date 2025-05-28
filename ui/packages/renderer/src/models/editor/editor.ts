import { create } from 'zustand';

import { EditorBackEnd, EditorMode, EditorState } from '@/components/editor/types';
import { globalLocalStorage } from '@/utils/storage';

export interface EditorStore {
  currentEditorStatus: EditorState | null;
  currentEditorContent?: string | null;
  currentEditorIsDirty?: boolean;
  nowSaved?: boolean;
  editorIsReadOnly?: boolean;
  editorMode?: EditorMode;
  editorBackEnd?: EditorBackEnd;
}

const editorBackEndSaveKey = 'editor-backend';
const editorModeSaveKey = 'editor-mode';

export const saveEditorBackEnd = (editorBackEnd: EditorBackEnd) => {
  globalLocalStorage.set(editorBackEndSaveKey, editorBackEnd);
};
const getSaveEditorBackEnd = (): EditorBackEnd | undefined => {
  return globalLocalStorage.get(editorBackEndSaveKey);
};

export const saveEditorMode = (mode: EditorMode) => {
  globalLocalStorage.set(editorModeSaveKey, mode);
};
const getSaveEditorMode = (): EditorMode | undefined => {
  return globalLocalStorage.get(editorModeSaveKey);
};

export const useEditorStore = create<EditorStore>(() => ({
  currentEditorStatus: null,
  editorIsReadOnly: undefined,
  editorBackEnd: getSaveEditorBackEnd(),
  editorMode: getSaveEditorMode(),
}));
