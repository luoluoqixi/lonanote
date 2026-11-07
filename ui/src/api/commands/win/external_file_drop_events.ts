import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export type ExternalFileDropEvent = {
  token?: string;
  error?: string;
  x: number;
  y: number;
  physical?: boolean;
};

export function listenExternalFileDrop(handler: (payload: ExternalFileDropEvent) => void) {
  // 必须与 Rust EventTarget::webview_window 匹配，Webview 监听收不到此定向事件。
  return getCurrentWebviewWindow().listen<ExternalFileDropEvent>(
    "lonanote://external-file-drop",
    ({ payload }) => handler(payload),
  );
}
