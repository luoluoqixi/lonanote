import { invoke } from "@/api/invoke";

export const app = {
  getVersion: async (): Promise<string> => {
    return (await invoke("app.get_version"))!;
  },
};
