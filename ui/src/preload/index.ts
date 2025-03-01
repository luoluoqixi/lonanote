import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge } from 'electron';

import { dialog } from './dialog';
import { invoke } from './invoke';
import { shell } from './shell';
import { utils } from './utils';

// Custom APIs for renderer
export const api = {
  invoke,
  utils,
  dialog,
  shell,
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  (window as any).electron = electronAPI;
  (window as any).api = api;
}
