import { ipcRenderer } from 'electron';

export const dialog = {
  /** 显示系统消息对话框 Info */
  showMessageBoxInfo: async (
    options: Electron.MessageBoxOptions,
  ): Promise<Electron.MessageBoxReturnValue> => {
    return await ipcRenderer.invoke('dialog.showDialogInfo', options);
  },
  /** 显示系统消息对话框 Warning */
  showMessageBoxWarning: async (
    options: Electron.MessageBoxOptions,
  ): Promise<Electron.MessageBoxReturnValue> => {
    return await ipcRenderer.invoke('dialog.showDialogWarning', options);
  },
  /** 显示系统消息对话框 Error */
  showMessageBoxError: async (
    options: Electron.MessageBoxOptions,
  ): Promise<Electron.MessageBoxReturnValue> => {
    return await ipcRenderer.invoke('dialog.showDialogError', options);
  },
  /** 显示系统消息对话框 Info */
  showMessageBoxInfoSync: async (options: Electron.MessageBoxOptions): Promise<number> => {
    return await ipcRenderer.invoke('dialog.showDialogInfoSync', options);
  },
  /** 显示系统消息对话框 Warning */
  showMessageBoxWarningSync: async (options: Electron.MessageBoxOptions): Promise<number> => {
    return await ipcRenderer.invoke('dialog.showDialogWarningSync', options);
  },
  /** 显示系统消息对话框 Error */
  showMessageBoxErrorSync: async (options: Electron.MessageBoxOptions): Promise<number> => {
    return await ipcRenderer.invoke('dialog.showDialogErrorSync', options);
  },
  /** 显示系统消息对话框 */
  showMessageBoxSync: async (options: Electron.MessageBoxOptions): Promise<number> => {
    return await ipcRenderer.invoke('dialog.showMessageBoxSync', options);
  },
  // MessageBox
  /** 显示系统消息对话框 */
  showMessageBox: async (
    options: Electron.MessageBoxOptions,
  ): Promise<Electron.MessageBoxReturnValue> => {
    return await ipcRenderer.invoke('dialog.showMessageBox', options);
  },

  // 系统选择对话框
  /** 显示系统选择对话框 */
  showSelectDialog: async (options: Electron.OpenDialogOptions): Promise<string> => {
    return await ipcRenderer.invoke('dialog.showSelectDialog', options);
  },
  /** 显示系统选择文件对话框 */
  showSelectFileDialog: async (options: Electron.OpenDialogOptions): Promise<string> => {
    return await ipcRenderer.invoke('dialog.showSelectFileDialog', options);
  },
  /** 显示系统选择文件夹对话框 */
  showSelectFolderDialog: async (options: Electron.OpenDialogOptions): Promise<string> => {
    return await ipcRenderer.invoke('dialog.showSelectFolderDialog', options);
  },
  /** 显示系统保存文件对话框 */
  showSaveDialog: async (options: Electron.SaveDialogOptions): Promise<string> => {
    return await ipcRenderer.invoke('dialog.showSaveDialog', options);
  },
};
