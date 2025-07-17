import { cmCanRedo, cmCanUndo, cmRedo, cmUndo } from '@/editor/codemirror';

export const canUndo = () => {
  if (window.editor != null) {
    return window.editor.canUndo();
  } else if (window.cmEditor != null) {
    return cmCanUndo(window.cmEditor);
  }
  return false;
};

export const canRedo = () => {
  if (window.editor != null) {
    return window.editor.canRedo();
  } else if (window.cmEditor != null) {
    return cmCanRedo(window.cmEditor);
  }
  return false;
};

export const undo = () => {
  if (window.editor != null) {
    window.editor.undo();
  } else if (window.cmEditor != null) {
    cmUndo(window.cmEditor);
  }
  return false;
};

export const redo = () => {
  if (window.editor != null) {
    window.editor.redo();
  } else if (window.cmEditor != null) {
    cmRedo(window.cmEditor);
  }
  return false;
};
