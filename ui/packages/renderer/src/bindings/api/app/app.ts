import { invoke } from '@/bindings/core';

export const app = {
  getVersion: async () => {
    return (await invoke('app.get_version'))!;
  },
};
