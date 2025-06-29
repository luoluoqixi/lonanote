import { getContent } from '@/editor';
import { saveForce } from '@/editor/autoSave';

export const changeSourceMode = async (mode: boolean) => {
  if (window.editor != null || window.cmEditor != null) {
    await saveForce(getContent);
  }
  window.sourceMode = mode;
  window.initEditor!(window.fileName!, window.sourceMode, window.fileContent!);
};
