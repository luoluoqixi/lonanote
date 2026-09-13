/// <reference types="vite/client" />

interface Window {
  __LONANOTE_EDITOR_BRIDGE_BOOTSTRAP__?: unknown;
  __LONANOTE_EDITOR_CONSOLE_FORWARDING_INSTALLED__?: boolean;
  ReactNativeWebView?: {
    injectedObjectJson?: () => string | null;
    postMessage?: (message: string) => void;
  };
}
