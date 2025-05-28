export const editorModeList = ['ir', 'sv', 'source'] as const;
export const editorBackEndList = ['milkdown', 'vditor'] as const;
// ['milkdown', 'vditor', 'hypermd', 'codemirror'] as const;

export type EditorMode = (typeof editorModeList)[number];
export type EditorBackEnd = (typeof editorBackEndList)[number];

export interface EditorState {
  charCount: number;
  rowIndex?: number;
  colIndex?: number;
}

export const defaultEditorIsReadOnly: boolean = false;
export const defaultEditorMode: EditorMode = 'ir';
export const defaultEditorBackEnd: EditorBackEnd = 'milkdown';
