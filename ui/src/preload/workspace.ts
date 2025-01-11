import { ipcRenderer } from 'electron';

export const workspace = {
  setCurrentWorkspace: async (path: string | null) => {
    await ipcRenderer.invoke('workspace.setCurrentWorkspace', path);
  },
  getCurrentWorkspaces: async (): Promise<string[]> => {
    return await ipcRenderer.invoke('workspace.getCurrentWorkspaces');
  },
  getCurrentWorkspace: async (): Promise<string | null> => {
    return await ipcRenderer.invoke('workspace.getCurrentWorkspace');
  },
};
