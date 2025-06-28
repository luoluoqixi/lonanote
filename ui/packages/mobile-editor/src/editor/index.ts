import { config } from '@/config';

import { autoSaveUpdate } from './autoSave';
import { cmFocus, createCMEditor } from './codemirror';
import { createMarkdownEditor } from './markdown/MarkdownEditor';

export const saveContent = (content: string) => {
  if (window.EditorBridge != null) {
    const msg = {
      command: 'save_file',
      content,
    };
    window.EditorBridge.postMessage(JSON.stringify(msg));
  }
};

export const getContent = () => {
  if (window.editor != null) {
    const content = window.editor.getMarkdown();
    window.fileContent = content;
    return content;
  } else if (window.cmEditor != null) {
    const content = window.cmEditor.state.doc.toString();
    window.fileContent = content;
    return content;
  }
  return null;
};

export const onUpdateState = (state?: {
  charCount?: number;
  rowIndex?: number;
  colIndex?: number;
}) => {
  if (window.EditorBridge != null) {
    const msg = {
      command: 'update_state',
      state,
    };
    window.EditorBridge.postMessage(JSON.stringify(msg));
  }
  autoSaveUpdate(getContent);
};

const bodyClick = (e: MouseEvent) => {
  if (e.target !== document.body) {
    if (e.target instanceof HTMLElement) {
      const id = e.target.id;
      if (
        id !== config.rootId &&
        id !== config.cmRootId &&
        id !== config.mdRootId &&
        !e.target.classList.contains('milkdown')
      ) {
        return;
      }
    }
  }
  if (window.editor != null) {
    const editor = window.editor;
    editor.focus();
    console.log('focus editor');
  }
  if (window.cmEditor != null) {
    cmFocus(window.cmEditor);
  }
};

export const createEditor = async (fileName: string, sourceMode: boolean, content: string) => {
  if (window.editor != null) {
    window.editor.destroy();
    window.editor = null;
  }
  if (window.cmEditor != null) {
    window.cmEditor.destroy();
    window.cmEditor = null;
  }
  const cmRoot = document.getElementById(config.cmRootId)!;
  const mdRoot = document.getElementById(config.mdRootId)!;
  if (sourceMode) {
    cmRoot.style.display = 'block';
    mdRoot.style.display = 'none';
    window.cmEditor = createCMEditor(cmRoot, content, fileName);
  } else {
    cmRoot.style.display = 'none';
    mdRoot.style.display = 'block';
    window.editor = createMarkdownEditor(mdRoot, content, window.previewMode || false);
  }

  document.body.removeEventListener('click', bodyClick);
  document.body.addEventListener('click', bodyClick);
};
