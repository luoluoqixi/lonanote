import { isElectron } from '@/bindings/core';

export const dialog = {
  showOpenFolderDialog: async (title: string | null, defaultPath?: string | null) => {
    title = title || 'Select Folder';
    defaultPath = defaultPath || '';
    if (isElectron && window.api) {
      return await (window.api as any).dialog.showSelectFolderDialog({
        title,
        defaultPath,
      });
    }
    throw new Error('Not implemented');
  },
};
