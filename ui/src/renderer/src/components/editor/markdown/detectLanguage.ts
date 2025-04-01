import { EditorBackEnd } from '@/models/editor';

export const isSupportMarkdown = (fileName: string) => {
  const index = fileName.lastIndexOf('.');
  if (index < 0) return false;
  const extName = fileName.substring(index + 1).toLowerCase();
  return supportExts.findIndex((x) => x === extName) >= 0;
};

/** 支持Markdown编辑器的扩展名 */
export const supportExts = ['md', 'markdown'] as const;

export const supportEditorModeChange = (editorBackEnd: EditorBackEnd) => {
  return editorBackEnd !== 'hypermd' && editorBackEnd !== 'codemirror';
};
