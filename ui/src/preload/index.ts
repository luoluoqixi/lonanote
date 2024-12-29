import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge, ipcRenderer } from 'electron';

let jsFunctions:
  | Record<
      string,
      ((args: string | null | undefined) => Promise<string | null | undefined>) | undefined
    >
  | undefined = undefined;

ipcRenderer.on('jsFunctionCall', async (_, key, args, returnChannel) => {
  if (!jsFunctions || !jsFunctions[key]) {
    ipcRenderer.send(returnChannel, 0);
    return;
  }
  let res: string | null | undefined;
  try {
    res = await jsFunctions[key](args);
  } catch (e) {
    console.error('jsFunctionCall error:', e);
    res = undefined;
  }
  ipcRenderer.send(returnChannel, 1, res);
});

let onZoomChangeCallbacks: Array<(zoom: number) => void> | undefined;
ipcRenderer.on('onZoomChange', (e, zoom) => {
  if (!onZoomChangeCallbacks) return;
  const count = onZoomChangeCallbacks.length;
  for (let i = 0; i < count; i++) {
    const cb = onZoomChangeCallbacks[i];
    try {
      if (cb) {
        cb(zoom);
      }
    } catch (e) {
      console.error(e);
    }
  }
});

// Custom APIs for renderer
const api = {
  setTitleBarColor: async (color: string, backgroudColor: string) => {
    await ipcRenderer.invoke('setTitleBarColor', color, backgroudColor);
  },
  getZoom: async () => {
    return await ipcRenderer.invoke('getZoom');
  },
  addZoomChangeListener: (callback: (zoom: number) => void) => {
    if (!onZoomChangeCallbacks) {
      onZoomChangeCallbacks = [];
    }
    if (onZoomChangeCallbacks.findIndex((c) => c === callback) < 0) {
      onZoomChangeCallbacks.push(callback);
    } else {
      console.warn(`onZoomChange function already exist`);
    }
  },
  removeZoomChangeListener: (callback: (zoom: number) => void) => {
    if (onZoomChangeCallbacks) {
      const index = onZoomChangeCallbacks.findIndex((c) => c === callback);
      if (index >= 0) {
        onZoomChangeCallbacks.slice(index);
      }
    }
  },

  invoke: async (key: string, args: string | null | undefined) => {
    return await ipcRenderer.invoke('invoke', key, args);
  },
  getCommandKeys: async () => {
    return await ipcRenderer.invoke('getCommandKeys');
  },
  getCommandLen: async () => {
    return await ipcRenderer.invoke('getCommandLen');
  },

  invokeAsync: async (key: string, args: string | null | undefined) => {
    return await ipcRenderer.invoke('invokeAsync', key, args);
  },
  getCommandAsyncKeys: async () => {
    return await ipcRenderer.invoke('getCommandAsyncKeys');
  },
  getCommandAsyncLen: async () => {
    return await ipcRenderer.invoke('getCommandAsyncLen');
  },

  regJsFunction: async (
    key: string,
    callback: (args: string | null | undefined) => Promise<string | null | undefined>,
  ) => {
    jsFunctions = jsFunctions || {};
    jsFunctions[key] = callback;
    return await ipcRenderer.invoke('regJsFunction', key);
  },
  unregJsFunction: async (key: string) => {
    if (jsFunctions) {
      jsFunctions[key] = undefined;
    }
    return await ipcRenderer.invoke('unregJsFunction', key);
  },
  clearJsFunction: async () => {
    jsFunctions = {};
    return await ipcRenderer.invoke('clearJsFunction');
  },
  getCommandJsKeys: async () => {
    return await ipcRenderer.invoke('getCommandJsKeys');
  },
  getCommandJsLen: async () => {
    return await ipcRenderer.invoke('getCommandJsLen');
  },
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
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
