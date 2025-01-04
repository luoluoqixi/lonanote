import { invokeAsync } from '@/bindings/core';

export const path = {
  getCacheDir: async (): Promise<string> => {
    return (await invokeAsync('get_cache_dir'))!;
  },
  getHomeDir: async (): Promise<string> => {
    return (await invokeAsync('get_home_dir'))!;
  },
  getDataDir: async (): Promise<string> => {
    return (await invokeAsync('get_data_dir'))!;
  },
  getDownloadDir: async (): Promise<string> => {
    return (await invokeAsync('get_download_dir'))!;
  },
};
