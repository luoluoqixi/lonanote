import { EditorBackEnd } from '../types';

export const isSupportMarkdown = (fileName: string) => {
  const index = fileName.lastIndexOf('.');
  if (index < 0) return false;
  const extName = fileName.substring(index + 1).toLowerCase();
  return supportMarkdownExts.findIndex((x) => x === extName) >= 0;
};

/** 支持Markdown编辑器的扩展名 */
export const supportMarkdownExts = ['md', 'markdown'] as const;

export const supportMarkdownEditorModeChange = (editorBackEnd: EditorBackEnd) => {
  return editorBackEnd === 'milkdown' || editorBackEnd === 'vditor';
  // editorBackEnd !== 'hypermd' && editorBackEnd !== 'codemirror';
};
