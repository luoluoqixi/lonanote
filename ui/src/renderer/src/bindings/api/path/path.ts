import { invoke } from '@/bindings/core';

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
};
