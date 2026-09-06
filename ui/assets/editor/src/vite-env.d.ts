/// <reference types="vite/client" />

interface Window {
  __LONANOTE_EDITOR_BRIDGE_BOOTSTRAP__?: unknown;
  ReactNativeWebView?: {
    injectedObjectJson?: () => string | null;
    postMessage?: (message: string) => void;
  };
}
