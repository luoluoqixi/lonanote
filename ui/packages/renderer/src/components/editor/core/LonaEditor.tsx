import clsx from 'clsx';
import { LonaEditor } from 'lonanote-editor';
import { CSSProperties, Ref, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import { useColorMode } from '@/components/provider/ColorModeProvider';

import { EditorMode } from '../types';
import './LonaEditor.scss';
import { useLonaEditor } from './hooks';

export interface LonaEditorRef {
  getEditor: () => LonaEditor | null;
  setValue: (content: string, useHistory?: boolean) => void;
  getValue: () => string | null;
}

export interface UpdateState {
  charCount: number;
  rowIndex: number;
  colIndex: number;
}

export interface LonaEditorProps {
  isMdEditor: boolean;
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
  showLineNumber?: boolean;
  lineWrap?: boolean;
  onFocusChange?: (focus: boolean) => void;
  onSave?: (content: string) => void;
  onUpdateStateListener?: (state: UpdateState) => void;
  onUpdate?: () => void;
  onClickAnyLink?: (link: string) => void;
}

export default forwardRef((props: LonaEditorProps, ref: Ref<LonaEditorRef>) => {
  const {
    className,
    style,
    filePath,
    readOnly,
    onSave,
    onFocusChange,
    onUpdateStateListener,
    onUpdate,
    onClickAnyLink,
    initValue,
    editMode,
    showLineNumber,
    lineWrap,
  } = props;
  const { resolvedColorMode } = useColorMode();
  const editorRootRef = useRef<HTMLDivElement>(null);

  const editor = useLonaEditor(() => {
    if (!editorRootRef.current) {
      console.error('Editor root element is not available');
      return null;
    }
    const editor = new LonaEditor();
    editor.create({
      filePath,
      readOnly,
      defaultValue: initValue,
      theme: resolvedColorMode,
      root: editorRootRef.current,
      extensionsConfig: {
        enableLineWrapping: lineWrap,
        enableLineNumbers: showLineNumber,
      },
      markdownConfig: {
        formattingDisplayMode: editMode === 'source' ? 'show' : 'auto',
      },
    });
    editor.addListener('onSave', (editor) => {
      onSave?.(editor.getValue() || '');
    });
    editor.addListener('onFocus', (_, focus) => {
      onFocusChange?.(focus);
    });
    editor.addListener('onUpdate', (editor) => {
      if (onUpdate) {
        onUpdate();
      }
      if (onUpdateStateListener) {
        const state = editor.getStatusInfo();
        onUpdateStateListener(state);
      }
    });
    return editor;
  }, [
    filePath,
    initValue,
    onSave,
    onFocusChange,
    onUpdate,
    onUpdateStateListener,
    onClickAnyLink,
    resolvedColorMode,
    showLineNumber,
    lineWrap,
  ]);

  useEffect(() => {
    if (!editor) return;
    editor.getEditor()?.setReadonly(readOnly || false);
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    getEditor() {
      return editor.getEditor();
    },
    setValue(content, useHistory) {
      if (!editor) return;
      editor.getEditor()?.setValue(content, { useHistory, scrollToTop: true });
    },
    getValue() {
      if (!editor) return null;
      return editor.getEditor()?.getValue() || null;
    },
  }));

  return <div ref={editorRootRef} style={style} className={clsx('cm6-theme', className)}></div>;
});
