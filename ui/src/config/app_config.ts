import { app } from "@/api";

const APP_NAME = "LonaNote";
const APP_NAME_CN = "露娜笔记";

export const getAppName = () => {
  const lang = navigator.language || "en";
  if (lang.startsWith("zh")) {
    return APP_NAME_CN;
  }
  return APP_NAME;
};

export const getVersion = async () => {
  return app.getVersion();
};
export const getAppTitle = async () => {
  const appName = getAppName();
  const version = await getVersion();
  return `${appName} - v${version}`;
};
