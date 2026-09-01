import Constants from "expo-constants";
import { NativeModules } from "react-native";

const editorDevPort = 5173;

export function getEditorDevUrl(): string | null {
  const host = getHost();
  if (host) {
    return `http://${host}:${editorDevPort}/`;
  }

  return null;
}

function getHost() {
  const sourceCode = NativeModules.SourceCode;
  const scriptURL = sourceCode?.getConstants()?.scriptURL;
  let hostname = getHttpHostname(scriptURL);
  if (hostname != null && hostname !== "localhost") {
    return hostname;
  }
  hostname = window.location?.hostname;
  if (hostname != null && hostname !== "localhost") {
    return hostname;
  }

  hostname = Constants.expoConfig?.extra?.devHost;
  if (hostname != null) {
    return hostname;
  }

  return null;
}

function getHttpHostname(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^https?:\/\/(\[[^\]]+\]|[^/:]+)/i);
  return match?.[1] ?? null;
}
