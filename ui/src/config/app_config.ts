import { app } from "@/api";

import { version } from "../../package.json";

let initialized = false;

const APP_NAME = "LonaNote";
const APP_NAME_CN = "露娜笔记";
const NPM_VERSION = version;
let APP_VERSION = NPM_VERSION;

export const getAppName = () => {
  const lang = navigator.language || "en";
  if (lang.startsWith("zh")) {
    return APP_NAME_CN;
  }
  return APP_NAME;
};

export const initAppConfig = async () => {
  if (!initialized) {
    APP_VERSION = await app.getVersion();
    initialized = true;
  }
};

export const getVersion = () => {
  return APP_VERSION;
};

export const getAppTitle = () => {
  const appName = getAppName();
  const version = getVersion();
  return `${appName} - v${version}`;
};
