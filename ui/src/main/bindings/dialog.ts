import { BrowserWindow, dialog as e_dialog, ipcMain as ipc } from 'electron';

let win: BrowserWindow | null = null;

// 选择对话框
const defaultFilters = [{ name: 'All Files', extensions: ['*'] }];

function getOptions<T>(options: any): T {
  options = options || {
    message: '',
  };
  return options;
}

const dialog = {
  setOwnWindow(ownWindow: BrowserWindow) {
    win = ownWindow;
  },

  // MessageBox对话框
  /**
   * 显示系统消息对话框 Info
   */
  showDialogInfo: async (options: Electron.MessageBoxOptions) => {
    options = getOptions(options);
    options.type = 'info';
    return dialog.showMessageBox(options);
  },
  /**
   * 显示系统消息对话框 Warning
   */
  showDialogWarning: async (options: Electron.MessageBoxOptions) => {
    options = getOptions(options);
    options.type = 'warning';
    return dialog.showMessageBox(options);
  },
  /**
   * 显示系统消息对话框 Error
   */
  showDialogError: async (options: Electron.MessageBoxOptions) => {
    options = getOptions(options);
    options.type = 'error';
    return dialog.showMessageBox(options);
  },
  /**
   * 显示系统消息对话框 Info
   */
  showDialogInfoSync(options: Electron.MessageBoxOptions) {
    options = getOptions(options);
    options.type = 'info';
    return dialog.showMessageBoxSync(options);
  },
  /**
   * 显示系统消息对话框 Warning
   */
  showDialogWarningSync(options: Electron.MessageBoxOptions) {
    options = getOptions(options);
    options.type = 'warning';
    return dialog.showMessageBoxSync(options);
  },
  /**
   * 显示系统消息对话框 Error
   */
  showDialogErrorSync(options: Electron.MessageBoxOptions) {
    options = getOptions(options);
    options.type = 'error';
    return dialog.showMessageBoxSync(options);
  },
  /**
   * 显示系统消息对话框
   */
  showMessageBox: async (options: Electron.MessageBoxOptions) => {
    options = getOptions(options);
    options.noLink = true;
    let result: Electron.MessageBoxReturnValue | null = null;
    if (win != null) {
      result = await e_dialog.showMessageBox(win, options);
    } else {
      result = await e_dialog.showMessageBox(options);
    }
    return result;
  },
  /**
   * 显示系统消息对话框
   */
  showMessageBoxSync(options: Electron.MessageBoxSyncOptions) {
    options = getOptions(options);
    options.buttons = options.buttons || ['确定'];
    options.noLink = true;
    if (win != null) {
      return e_dialog.showMessageBoxSync(win, options);
    }
    return e_dialog.showMessageBoxSync(options);
  },

  /**
   * 显示系统选择对话框
   */
  showSelectDialog: async (options: Electron.OpenDialogOptions): Promise<string[] | undefined> => {
    if (options == null) options = {};
    const i = options.properties?.indexOf('openFile') || -1;
    const isFile = i >= 0;
    options.title = options.title || (isFile ? 'Select File' : 'Select Folder');
    if (isFile) {
      options.filters = options.filters || defaultFilters;
    }
    let data: Electron.OpenDialogReturnValue | null = null;
    if (win != null) {
      data = await e_dialog.showOpenDialog(win, options);
    } else {
      data = await e_dialog.showOpenDialog(options);
    }
    if (data.canceled) {
      return;
    }
    return data.filePaths;
  },
  /**
   * 显示系统选择文件对话框
   */
  showSelectFileDialog: async (options: Electron.OpenDialogOptions) => {
    if (options == null) options = {};
    options.properties = ['openFile'];
    const paths = await dialog.showSelectDialog(options);
    return paths && paths.length > 0 ? paths[0] : undefined;
  },
  /**
   * 显示系统选择文件夹对话框
   */
  showSelectFolderDialog: async (options: Electron.OpenDialogOptions) => {
    if (options == null) options = {};
    options.properties = ['openDirectory'];
    const paths = await dialog.showSelectDialog(options);
    return paths && paths.length > 0 ? paths[0] : undefined;
  },
  /**
   * 显示系统保存文件对话框
   */
  showSaveDialog: async (options: Electron.SaveDialogOptions) => {
    if (options == null) options = {};
    options.title = options.title || '保存文件';
    options.filters = options.filters || defaultFilters;
    let data: Electron.SaveDialogReturnValue | null = null;
    if (win != null) {
      data = await e_dialog.showSaveDialog(win, options);
    } else {
      data = await e_dialog.showSaveDialog(options);
    }
    if (data.canceled) {
      return;
    }
    return data.filePath;
  },
};

export const initDialogIPC = (win: BrowserWindow) => {
  dialog.setOwnWindow(win);
  // IPC通信
  // MessageBox对话框
  ipc.handle('dialog.showMessageBox', async (_event, options) => {
    return dialog.showMessageBox(options);
  });
  ipc.handle('dialog.showMessageBoxSync', async (_event, options) => {
    return dialog.showMessageBoxSync(options);
  });
  ipc.handle('dialog.showDialogInfo', async (_event, options) => {
    return dialog.showDialogInfo(options);
  });
  ipc.handle('dialog.showDialogWarning', async (_event, options) => {
    return dialog.showDialogWarning(options);
  });
  ipc.handle('dialog.showDialogError', async (_event, options) => {
    return dialog.showDialogError(options);
  });
  ipc.handle('dialog.showDialogInfoSync', async (_event, options) => {
    return dialog.showDialogInfoSync(options);
  });
  ipc.handle('dialog.showDialogWarningSync', async (_event, options) => {
    return dialog.showDialogWarningSync(options);
  });
  ipc.handle('dialog.showDialogErrorSync', async (_event, options) => {
    return dialog.showDialogErrorSync(options);
  });

  // 选择对话框
  ipc.handle('dialog.showSelectDialog', async (_event, options) => {
    return dialog.showSelectDialog(options);
  });
  ipc.handle('dialog.showSelectFileDialog', async (_event, options) => {
    return dialog.showSelectFileDialog(options);
  });
  ipc.handle('dialog.showSelectFolderDialog', async (_event, options) => {
    return dialog.showSelectFolderDialog(options);
  });
  ipc.handle('dialog.showSaveDialog', async (_event, options) => {
    return dialog.showSaveDialog(options);
  });
};

export { dialog };
