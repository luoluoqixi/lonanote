import { NativeModules } from "react-native";

const editorDevPort = 5173;

type SourceCodeModule = {
  scriptURL?: unknown;
};

/** 从 Metro bundle URL 解析开发机 host，并拼接 editor Vite 服务地址。 */
export function getEditorDevUrl(): string | null {
  const sourceCode = NativeModules.SourceCode as SourceCodeModule | undefined;
  const metroHost = getHttpHostname(sourceCode?.scriptURL);
  if (metroHost) {
    return `http://${metroHost}:${editorDevPort}/`;
  }

  if (typeof window !== "undefined") {
    const hostname = window.location?.hostname;
    if (hostname) return `http://${hostname}:${editorDevPort}/`;
  }

  return null;
}

function getHttpHostname(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const match = value.match(/^https?:\/\/(\[[^\]]+\]|[^/:]+)/i);
  return match?.[1] ?? null;
}
