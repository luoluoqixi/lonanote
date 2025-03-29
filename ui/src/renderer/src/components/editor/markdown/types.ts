import { CSSProperties } from 'react';

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
  fileName: string;
  style?: CSSProperties;
  className?: string;
  readOnly?: boolean;
  onSave?: (content: string) => void;
  onUpdateListener?: (state: UpdateState | null) => void;
}
