import { ipcRenderer } from 'electron';

const createChangeCallbacks = <T>(key: string) => {
  let onChangeCallbacks: Array<(zoom: T) => void> | undefined;
  ipcRenderer.on(key, (e, args) => {
    if (!onChangeCallbacks) return;
    const count = onChangeCallbacks.length;
    for (let i = 0; i < count; i++) {
      const cb = onChangeCallbacks[i];
      try {
        if (cb) {
          cb(args);
        }
      } catch (e) {
        console.error(e);
      }
    }
  });
  return {
    addListener: (callback: (args: T) => void) => {
      if (!onChangeCallbacks) {
        onChangeCallbacks = [];
      }
      if (onChangeCallbacks.findIndex((c) => c === callback) < 0) {
        onChangeCallbacks.push(callback);
      } else {
        console.warn(`${key} function already exist`);
      }
    },
    removeListener: (callback: (args: T) => void) => {
      if (onChangeCallbacks) {
        const index = onChangeCallbacks.findIndex((c) => c === callback);
        if (index >= 0) {
          onChangeCallbacks.slice(index);
        }
      }
    },
  };
};

const onZoomChange = createChangeCallbacks<number>('onZoomChange');

const onWindowSize = createChangeCallbacks<{ width: number; height: number }>('onWindowSizeChange');

export const utils = {
  setTitleBarColor: async (color: string, backgroudColor: string) => {
    await ipcRenderer.invoke('setTitleBarColor', color, backgroudColor);
  },
  getZoom: async (): Promise<number> => {
    return await ipcRenderer.invoke('getZoom');
  },
  setZoom: async (zoom: number) => {
    return await ipcRenderer.invoke('setZoom', zoom);
  },
  addZoomChangeListener: (callback: (zoom: number) => void) => {
    onZoomChange.addListener(callback);
  },
  removeZoomChangeListener: (callback: (zoom: number) => void) => {
    onZoomChange.removeListener(callback);
  },
  resetWindowSize: async () => {
    await ipcRenderer.invoke('resetWindowSize');
  },
  getWindowSize: async (): Promise<{ width: number; height: number }> => {
    return await ipcRenderer.invoke('getWindowSize');
  },
  addWindowSizeChangeListener: (
    callback: (windowSize: { width: number; height: number }) => void,
  ) => {
    onWindowSize.addListener(callback);
  },
  removeWindowSizeChangeListener: (
    callback: (windowSize: { width: number; height: number }) => void,
  ) => {
    onWindowSize.removeListener(callback);
  },
  getPublicDir: async (): Promise<string> => {
    return await ipcRenderer.invoke('getPublicDir');
  },
  getPublicFiles: async (
    folder: string,
    type: 'folder' | 'file' | 'all',
    recursive: boolean,
  ): Promise<string[]> => {
    return await ipcRenderer.invoke('getPublicFiles', folder, type, recursive);
  },
  getMediaUrl: (filePath: string) => `media:///${filePath}`,
};
