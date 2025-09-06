import { Extension } from '@codemirror/state';
import { LonaEditor } from 'lonanote-editor';

import { callFlutter } from '@/utils/flutter';

import { onUpdateState, saveContent } from '..';
import './editor.scss';

export const create = (
  root: HTMLElement,
  content: string,
  fileName: string,
  extensions?: Extension[],
) => {
  if (root) {
    const isShowLineNumber = window.isShowLineNumber;
    const readOnly = window.previewMode ? true : false;
    const sourceMode = readOnly ? false : window.sourceMode;
    const theme = window.colorMode === 'dark' ? 'dark' : 'light';
    const primaryColor = window.primaryColor || '#1890ff';
    const editor = new LonaEditor();
    editor.create({
      root,
      theme,
      filePath: fileName,
      defaultValue: content,
      readOnly,
      extensions,
      extensionsConfig: {
        enableLineNumbers: isShowLineNumber || false,
        enableLineWrapping: true,
      },
      markdownTheme: {
        primaryColor,
      },
      markdownConfig: {
        formattingDisplayMode: sourceMode ? 'show' : 'auto',
        featuresConfigs: {
          Link: {
            onLinkClickPreview(url, event) {
              event.preventDefault();
              callFlutter('on_link_click_preview', url);
            },
            onLinkClickSource(url, event) {
              event.preventDefault();
              callFlutter('on_link_click_source', url);
            },
          },
        },
        defaultSlashMenu: { show: false },
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
