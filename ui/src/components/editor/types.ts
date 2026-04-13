export const editorModeList = ['ir', 'sv', 'source'] as const;

export type EditorMode = (typeof editorModeList)[number];

export interface EditorState {
  charCount: number;
  rowIndex?: number;
  colIndex?: number;
}

export const defaultEditorIsReadOnly: boolean = false;
export const defaultEditorMode: EditorMode = 'ir';
