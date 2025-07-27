import { LonaEditor } from 'lonanote-editor';

import { onUpdateState, saveContent } from '..';
import './editor.scss';

export const create = (
  root: HTMLElement,
  content: string,
  fileName: string,
  isShowLineNumber: boolean | undefined,
) => {
  if (root) {
    if (isShowLineNumber) {
      root.classList.add('source-mode-show-line');
    } else {
      root.classList.remove('source-mode-show-line');
    }
    const theme = window.colorMode === 'dark' ? 'dark' : 'light';
    const editor = new LonaEditor();
    editor.create({
      root,
      theme,
      filePath: fileName,
      defaultValue: content,
      extensionsConfig: {
        enableLineNumbers: isShowLineNumber || false,
        enableLineWrapping: true,
      },
    });

    editor.addListener('onSave', (editor) => {
      if (saveContent) {
        saveContent(editor.getValue() || '');
      }
    });

    editor.addListener('onUpdate', (editor) => {
      if (onUpdateState) {
        onUpdateState(editor.getStatusInfo());
      }
    });

    return editor;
  }

  return null;
};
