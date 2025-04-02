import { create } from 'zustand';

import { globalLocalStorage } from '@/utils/storage';

export const editorModeList = ['ir', 'sv', 'source'] as const;
export const editorBackEndList = ['milkdown', 'vditor'] as const;
// ['milkdown', 'vditor', 'hypermd', 'codemirror'] as const;

export type EditorMode = (typeof editorModeList)[number];
export type EditorBackEnd = (typeof editorBackEndList)[number];

export const defaultEditorIsReadOnly: boolean = false;
export const defaultEditorMode: EditorMode = 'ir';
export const defaultEditorBackEnd: EditorBackEnd = 'vditor';

export interface EditorStore {
  currentEditorStatus: EditorState | null;
  currentEditorContent?: {
    content: string;
  } | null;
  editorIsReadOnly?: boolean;
  editorMode?: EditorMode;
  editorBackEnd?: EditorBackEnd;
}

export interface EditorState {
  charCount: number;
  rowIndex?: number;
  colIndex?: number;
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
