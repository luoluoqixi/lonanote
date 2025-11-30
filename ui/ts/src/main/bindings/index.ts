import { app } from 'electron';

import { getActiveWin } from '../app';
import * as bindings from './bindings';
import { initContextMenuIPC } from './contextMenu';
import { initDialogIPC } from './dialog';
import { initShellIPC } from './shell';
import { initSystemIPC } from './system';

export * from './bindings';

const initInvokeIpc = (ipcMain: Electron.IpcMain) => {
  let returnSequence = 0;
  const jsFunctionCallChannel = 'jsFunctionCall';
  const jsFunctionCall = (
    webContents: Electron.WebContents,
    key: string,
    args: string | null | undefined,
  ): Promise<string | null | undefined> => {
    return new Promise((resolve, reject) => {
      if (webContents) {
        if (webContents.isLoading()) {
          reject(new Error('webContents is loading'));
          return;
        }
        if (returnSequence >= Number.MAX_SAFE_INTEGER) {
          returnSequence = 0;
        }
        const returnChannel = `${jsFunctionCallChannel}:return:${returnSequence++}`;
        ipcMain.once(returnChannel, (_, code, result) => {
          if (code === 1) {
            resolve(result);
          } else {
            reject(new Error(`notfound js function: ${key}`));
          }
        });
        webContents.send(jsFunctionCallChannel, key, args, returnChannel);
      } else {
        resolve(undefined);
      }
    });
  };
  ipcMain.removeHandler('invoke');
  ipcMain.removeHandler('getCommandKeys');
  ipcMain.removeHandler('getCommandLen');
  ipcMain.removeHandler('invokeAsync');
  ipcMain.removeHandler('getCommandAsyncKeys');
  ipcMain.removeHandler('getCommandAsyncLen');
  ipcMain.removeHandler('regJsFunction');
  ipcMain.removeHandler('unregJsFunction');
  ipcMain.removeHandler('clearJsFunction');
  ipcMain.removeHandler('getCommandJsKeys');
  ipcMain.removeHandler('getCommandJsLen');

  ipcMain.handle('invoke', async (_, key, args) => {
    return bindings.invoke(key, args);
  });
  ipcMain.handle('getCommandKeys', async () => {
    return bindings.getCommandKeys();
  });
  ipcMain.handle('getCommandLen', async () => {
    return bindings.getCommandLen();
  });
  ipcMain.handle('invokeAsync', async (_, key, args) => {
    return await bindings.invokeAsync(key, args);
  });
  ipcMain.handle('getCommandAsyncKeys', async () => {
    return bindings.getCommandAsyncKeys();
  });
  ipcMain.handle('getCommandAsyncLen', async () => {
    return bindings.getCommandAsyncLen();
  });
  ipcMain.handle('regJsFunction', async (_, key) => {
    return bindings.regJsFunction(key, (args) => {
      const win = getActiveWin();
      if (win == null) throw new Error('active window is null');
      return jsFunctionCall(win.webContents, key, args);
    });
  });
  ipcMain.handle('unregJsFunction', async (_, key) => {
    return bindings.unregJsFunction(key);
  });
  ipcMain.handle('clearJsFunction', async () => {
    return bindings.clearJsFunction();
  });
  ipcMain.handle('getCommandJsKeys', async () => {
    return bindings.getCommandJsKeys();
  });
  ipcMain.handle('getCommandJsLen', async () => {
    return bindings.getCommandJsLen();
  });

  bindings.clearJsFunction();
};

const initPath = async () => {
  const s = process.platform === 'win32' ? '\\' : '/';
  const dirs = {
    dataDir: app.getPath('userData'),
    cacheDir: `${app.getPath('temp')}${s}${app.name}`,
    downloadDir: app.getPath('downloads'),
    homeDir: app.getPath('home'),
  };
  bindings.invoke('path.init_dir', JSON.stringify(dirs));
};

export const initBindings = async (ipcMain: Electron.IpcMain) => {
  initInvokeIpc(ipcMain);
  initPath();
  initShellIPC();
  initDialogIPC();
  initSystemIPC();
  initContextMenuIPC();
};
