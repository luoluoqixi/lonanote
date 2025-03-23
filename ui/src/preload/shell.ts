import { OpenExternalOptions, ipcRenderer } from 'electron';

export const shell = {
  openPathInFolder: async (path: string) => {
    await ipcRenderer.invoke('shell.openPathInFolder', path);
  },
  openPath: async (path: string) => {
    await ipcRenderer.invoke('shell.openPath', path);
  },
  openExternal: async (url: string, options?: OpenExternalOptions) => {
    await ipcRenderer.invoke('shell.openExternal', url, options);
  },
};
