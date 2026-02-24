import debounce from 'lodash/debounce';

import { saveContent } from '.';

type UpdateContentAutoSaveFunc = (
  autoSave: boolean | undefined,
  autoSaveInterval: number,
  getEditorValue: () => string | null | undefined,
) => void;
const updateContentAutoSaveInner: UpdateContentAutoSaveFunc = (
  autoSave,
  autoSaveInterval,
  getEditorValue,
) => {
  const content = getEditorValue();
  if (content == null) {
    console.warn('content is null, skip auto save');
    return;
  }
  const currentContent = window.fileContent;
  if (
    currentContent == null ||
    currentContent.length !== content.length ||
    currentContent !== content
  ) {
    saveStart(content, autoSave, autoSaveInterval);
  }
};
const debounceUpdateContentAutoSaveInner = debounce(updateContentAutoSaveInner, 100);

export const autoSaveUpdate = (getEditorValue: () => string | null | undefined) => {
  const autoSave = window.autoSave;
  const autoSaveInterval = window.autoSaveInterval;
  let wait = autoSaveInterval == null ? 1000 : autoSaveInterval * 1000;
  if (wait < 100) {
    wait = 100; // 最小100ms
  }
  debounceUpdateContentAutoSaveInner(autoSave, wait, getEditorValue);
};

export const saveForce = (getEditorValue: () => string | null | undefined) => {
  const content = getEditorValue();
  if (content == null) return;
  window.fileContent = content;
  saveContent(content);
};

let saveInterval: number | null = null;

const saveStart = async (content: string, autoSave: boolean | undefined, interval?: number) => {
  if (content == null) return;
  if (autoSave) {
    window.fileContent = content;
    const save = async () => {
      if (window.fileContent != null) {
        saveContent(window.fileContent);
      }
    };
    if (interval) {
      if (saveInterval != null) {
        window.clearTimeout(saveInterval);
        saveInterval = null;
      }
      saveInterval = window.setTimeout(save, interval);
    } else {
      await save();
    }
  } else {
    window.fileContent = content;
  }
};
