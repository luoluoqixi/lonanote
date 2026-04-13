import { invoke, isElectron } from '@/bindings/core';

export const path = {
  getCacheDir: async (): Promise<string> => {
    return (await invoke('path.get_cache_dir'))!;
  },
  getHomeDir: async (): Promise<string> => {
    return (await invoke('path.get_home_dir'))!;
  },
  getDataDir: async (): Promise<string> => {
    return (await invoke('path.get_data_dir'))!;
  },
  getDownloadDir: async (): Promise<string> => {
    return (await invoke('path.get_download_dir'))!;
  },
  getDocumentDir: async () => {
    if (isElectron && window.api) {
      return window.api.utils.getDocumentDir();
    }
    return null;
  },
  getPublicDir: async () => {
    if (isElectron && window.api) {
      return window.api.utils.getPublicDir();
    }
    return null;
  },
  getPublicFiles: async (
    folder: string,
    type: 'folder' | 'file' | 'all',
    recursive: boolean,
  ): Promise<string[] | null> => {
    if (isElectron && window.api) {
      return window.api.utils.getPublicFiles(folder, type, recursive);
    }
    return null;
  },
};
