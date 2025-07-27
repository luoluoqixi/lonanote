import { getContent } from '@/editor';
import { saveForce } from '@/editor/autoSave';

export const changeSourceMode = (mode: boolean) => {
  if (window.editor != null) {
    saveForce(getContent);
  }
  window.sourceMode = mode;
  window.initEditor!(
    window.fileName!,
    window.sourceMode,
    window.isShowLineNumber,
    window.fileContent!,
  );
};
