import { CSSProperties } from 'react';

import { EditorEditMode } from '@/models/editor';

export interface MarkdownEditorRef {
  getMarkdown: () => string | undefined;
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
  editMode: EditorEditMode;
  fileName: string;
  style?: CSSProperties;
  className?: string;
  readOnly?: boolean;
  onSave?: (content: string) => void;
  onUpdateListener?: (state: UpdateState | null) => void;
  onClickRelativeLink?: (link: string) => void;
}
