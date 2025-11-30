export const changePreviewMode = (mode: boolean) => {
  window.previewMode = mode;
  if (window.editor != null) {
    if (window.sourceMode) {
      window.initEditor!(window.fileName!, window.fileContent!);
    } else {
      window.editor.setReadonly(mode);
    }
  }
};
