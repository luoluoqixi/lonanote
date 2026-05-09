import { initAppConfig } from "./app_config";

export * from "./consts";
export * from "./app_config";

export const initConfig = async () => {
  await initAppConfig();
};
