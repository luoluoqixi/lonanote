import { isNode } from '@/bindings/core';

export const dialog = {
  showOpenFolderDialog: async (title: string | null, defaultPath?: string | null) => {
    title = title || 'Select Folder';
    defaultPath = defaultPath || '';
    if (isNode && window.api) {
      return await window.api.dialog.showSelectFolderDialog({
        title,
        defaultPath,
      });
    }
    throw new Error('Not implemented');
  },
};
