export const canUndo = () => {
  if (window.editor != null) {
    return window.editor.canUndo();
  }
  return false;
};

export const canRedo = () => {
  if (window.editor != null) {
    return window.editor.canRedo();
  }
  return false;
};

export const undo = () => {
  if (window.editor != null) {
    window.editor.undo();
  }
};

export const redo = () => {
  if (window.editor != null) {
    window.editor.redo();
  }
};
