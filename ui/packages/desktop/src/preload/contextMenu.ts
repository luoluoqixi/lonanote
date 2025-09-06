import { ipcRenderer } from 'electron';

import { MenuItemConfig } from '../main/types';

export const contextMenu = {
  showContextMenu: async (
    menus: MenuItemConfig[],
    callback: (data: { command: string; data: any }) => void,
  ) => {
    ipcRenderer.removeAllListeners('context-menu-command');
    ipcRenderer.on('context-menu-command', (event, data) => {
      ipcRenderer.removeAllListeners('context-menu-command');
      callback(data);
    });
    await ipcRenderer.invoke('context_menu.show_context_menu', menus);
  },
};
