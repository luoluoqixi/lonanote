import {
  BrowserWindow,
  IpcMainInvokeEvent,
  Menu,
  MenuItemConstructorOptions,
  ipcMain as ipc,
} from 'electron';

import { MenuItemConfig } from '../types';

const contextMenu = {
  showContextMenu: (e: IpcMainInvokeEvent, menus: MenuItemConfig[]) => {
    const window = BrowserWindow.fromWebContents(e.sender);
    if (!window) return;

    const getItem = (item: MenuItemConfig): MenuItemConstructorOptions => {
      if (item.type === 'separator') {
        return { type: 'separator' };
      }
      const menuItem: MenuItemConstructorOptions = {
        ...item,
        click: () => {
          e.sender.send('context-menu-command', {
            command: item.id,
            data: item.data,
          });
        },
      };
      if (item.submenu) {
        menuItem.submenu = item.submenu.map((i) => getItem(i));
      }
      return menuItem;
    };
    const template = menus.map(getItem);
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window });
  },
};

export const initContextMenuIPC = () => {
  ipc.handle('context_menu.show_context_menu', async (event, path) => {
    return contextMenu.showContextMenu(event, path);
  });
};

export { contextMenu };
