import { version } from "@/../package.json";
import { isWebOnly } from "@/api/common";
import { invoke } from "@/api/invoke";

export const app = {
  getVersion: async (): Promise<string> => {
    return isWebOnly() ? version : (await invoke("app.get_version"))!;
  },
};
