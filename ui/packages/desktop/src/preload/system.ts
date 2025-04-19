import { ipcRenderer } from 'electron';

export const system = {
  cut: async (): Promise<void> => {
    await ipcRenderer.invoke('system.cut');
  },
  copy: async (): Promise<void> => {
    await ipcRenderer.invoke('system.copy');
  },
  paste: async (): Promise<void> => {
    await ipcRenderer.invoke('system.paste');
  },
  selectAll: async (): Promise<void> => {
    await ipcRenderer.invoke('system.selectAll');
  },
};
