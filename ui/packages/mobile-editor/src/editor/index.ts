import { autoSaveUpdate } from './autoSave';
import { createCMEditor } from './codemirror';
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
    return window.editor.getMarkdown();
  } else if (window.cmEditor != null) {
    return window.cmEditor.state.doc.toString();
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

export const createEditor = async (fileName: string, sourceMode: boolean, content: string) => {
  const root = document.getElementById('root')!;
  if (window.editor != null) {
    window.editor.destroy();
    window.editor = null;
  }
  if (window.cmEditor != null) {
    window.cmEditor.destroy();
    window.cmEditor = null;
  }
  if (sourceMode) {
    window.cmEditor = createCMEditor(root, content, fileName);
  } else {
    window.editor = createMarkdownEditor(root, content, window.previewMode || false);
  }
};
