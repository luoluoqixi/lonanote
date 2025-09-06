import { ipcMain as ipc } from 'electron';

import { getActiveWin } from '../app';

const exeCommand = (role: 'cut' | 'copy' | 'paste' | 'selectAll') => {
  const win = getActiveWin();
  if (!win) return;
  if (role === 'cut') {
    win.webContents.cut();
  } else if (role === 'copy') {
    win.webContents.copy();
  } else if (role === 'paste') {
    win.webContents.paste();
  } else if (role === 'selectAll') {
    win.webContents.selectAll();
  }
};

const system = {
  cut: async (): Promise<void> => {
    exeCommand('cut');
  },
  copy: async (): Promise<void> => {
    exeCommand('copy');
  },
  paste: async (): Promise<void> => {
    exeCommand('paste');
  },
  selectAll: async (): Promise<void> => {
    exeCommand('selectAll');
  },
};

export const initSystemIPC = () => {
  ipc.handle('system.cut', async () => {
    return system.cut();
  });
  ipc.handle('system.copy', async () => {
    return system.copy();
  });
  ipc.handle('system.paste', async () => {
    return system.paste();
  });
  ipc.handle('system.selectAll', async () => {
    return system.selectAll();
  });
};

export { system };
