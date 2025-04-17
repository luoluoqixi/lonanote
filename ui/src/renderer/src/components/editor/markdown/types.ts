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
  /** 基于当前workspace的根目录 */
  workspaceRootPath: string;
  /** 基于当前文件的根目录 */
  mediaRootPath: string;
  /** 默认上传文件的路径 */
  defaultUploadPath: string;
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
