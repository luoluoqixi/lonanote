export const changePreviewMode = (mode: boolean) => {
  window.previewMode = mode;
  if (window.editor != null) {
    window.editor.setReadonly(mode);
  }
};
