import { OpenExternalOptions, shell as electronShell, ipcMain as ipc } from 'electron';

const shell = {
  openPathInFolder: (path: string) => {
    if (process.platform === 'win32' && 'file://') {
      // windows系统下 使用 file:// 或 使用反斜杠
      path = `file://${path}`;
    }
    electronShell.showItemInFolder(path);
  },
  openPath: (path: string) => {
    return electronShell.openPath(path);
  },
  openExternal: async (url: string, options?: OpenExternalOptions): Promise<void> => {
    return await electronShell.openExternal(url, options);
  },
};

export const initShellIPC = () => {
  ipc.handle('shell.openPathInFolder', async (_event, path) => {
    return shell.openPathInFolder(path);
  });
  ipc.handle('shell.openPath', async (_event, path) => {
    return shell.openPath(path);
  });
  ipc.handle('shell.openExternal', async (_event, url, options) => {
    return shell.openExternal(url, options);
  });
};

export { shell };
