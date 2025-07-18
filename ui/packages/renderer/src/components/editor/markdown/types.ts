import { CSSProperties } from 'react';

import { EditorMode } from '../types';

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
  /** 默认上传附件的路径 */
  defaultUploadAttachmentPath: string;
  editorId: string;
  editMode: EditorMode;
  filePath: string;
  style?: CSSProperties;
  className?: string;
  readOnly?: boolean;
  initValue: string | null;
  onFocusChange?: (focus: boolean) => void;
  onSave?: (content: string) => void;
  onUpdateStateListener?: (state: UpdateState | null) => void;
  onUpdate?: () => void;
  onClickAnyLink?: (link: string) => void;
}
