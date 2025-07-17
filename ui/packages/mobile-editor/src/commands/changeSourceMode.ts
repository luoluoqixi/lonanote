import { getContent } from '@/editor';
import { saveForce } from '@/editor/autoSave';

export const changeSourceMode = (mode: boolean) => {
  if (window.editor != null || window.cmEditor != null) {
    saveForce(getContent);
  }
  window.sourceMode = mode;
  window.initEditor!(
    window.fileName!,
    window.sourceMode,
    window.isSourceModeShowLine,
    window.fileContent!,
  );
};
