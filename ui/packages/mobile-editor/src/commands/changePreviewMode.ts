import { setCMReadOnly } from '@/editor/codemirror';

export const changePreviewMode = async (mode: boolean) => {
  window.previewMode = mode;
  if (window.editor != null) {
    window.editor.setReadonly(mode);
  } else if (window.cmEditor != null) {
    setCMReadOnly(mode);
  }
};
