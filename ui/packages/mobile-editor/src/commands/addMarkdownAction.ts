export const addMarkdownAction = (action: number | null) => {
  if (action != null && typeof action === 'number') {
    if (window.editor) {
      window.editor.runActionValue(action);
    } else if (window.cmEditor) {
      //
    }
  }
};
