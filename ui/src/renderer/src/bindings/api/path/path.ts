import { invoke } from '@/bindings/core';

export const path = {
  getCacheDir: async (): Promise<string> => {
    return (await invoke('get_cache_dir'))!;
  },
  getHomeDir: async (): Promise<string> => {
    return (await invoke('get_home_dir'))!;
  },
  getDataDir: async (): Promise<string> => {
    return (await invoke('get_data_dir'))!;
  },
  getDownloadDir: async (): Promise<string> => {
    return (await invoke('get_download_dir'))!;
  },
};
