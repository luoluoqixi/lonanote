import { BrowserWindow, ipcMain as ipc } from 'electron';

import { addWindowsChangeEvent } from '../app';

const workspaceMap = new Map<BrowserWindow, string | null>();

export const initWorkspaceIPC = () => {
  ipc.handle('workspace.setCurrentWorkspace', async (event, path) => {
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    if (currentWindow) {
      if (path != null) {
        workspaceMap.set(currentWindow, path);
      } else {
        if (workspaceMap.has(currentWindow)) {
          workspaceMap.delete(currentWindow);
        }
      }
    }
  });
  ipc.handle('workspace.getCurrentWorkspace', async (event) => {
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    if (currentWindow) {
      if (workspaceMap.has(currentWindow)) {
        return workspaceMap.get(currentWindow);
      }
    }
    return null;
  });
  ipc.handle('workspace.getCurrentWorkspaces', async () => {
    const workspaces: Array<string | null> = [];
    for (const [, v] of workspaceMap) {
      if (v != null) {
        workspaces.push(v);
      }
    }
    return workspaces;
  });

  addWindowsChangeEvent((win, event) => {
    if (event === 'close') {
      if (workspaceMap.has(win)) {
        workspaceMap.delete(win);
      }
    }
  });
};
