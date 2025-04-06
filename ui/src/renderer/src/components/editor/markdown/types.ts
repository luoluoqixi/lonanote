import { CSSProperties } from 'react';

import { EditorMode } from '@/models/editor';

export interface MarkdownEditorRef {
  getValue: () => string | undefined;
  setValue: (content: string, useHistory?: boolean) => void;
}

export interface UpdateState {
  charCount: number;
  rowIndex?: number;
  colIndex?: number;
}

export interface MarkdownEditorProps {
  mediaRootPath: string;
  editorId: string;
  editMode: EditorMode;
  filePath: string;
  style?: CSSProperties;
  className?: string;
  readOnly?: boolean;
  onSave?: (content: string) => void;
  onUpdateListener?: (state: UpdateState | null) => void;
  onClickAnyLink?: (link: string) => void;
}
