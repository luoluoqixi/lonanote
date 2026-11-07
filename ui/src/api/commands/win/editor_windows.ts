import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import { isDesktop, isTauri } from "@/api/common/platform";
import { editorWindowRuntime } from "@/components/editor/controllers/editor_window_runtime";

export type EditorWindowBootstrap = {
  windowLabel: string;
  role: "workbench" | "editor";
  sessionId: string;
  ownerWindowLabel: string;
  ownerEpoch: number;
  checkpoint: unknown;
  initialPayload?: unknown;
  ownerDestroyed?: boolean;
};
export type EditorWindowMessage = {
  fromWindowLabel: string;
  toWindowLabel: string;
  sessionId: string;
  ownerEpoch: number;
  requestId: string;
  payload: unknown;
};
async function invokeDesktop<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isDesktop() || !isTauri()) throw new Error("当前平台不支持辅助编辑器窗口");
  return invoke<T>(command, args);
}
export const editorWindows = {
  closeCurrent: () => invokeDesktop<boolean>("request_window_close"),
  beginTabDrag: (token: string, editorId: string) =>
    invokeDesktop<void>("begin_editor_tab_drag", { token, editorId }),
  takeTabDrag: (token: string, targetWindowLabel: string) =>
    invokeDesktop<[string, string]>("take_editor_tab_drag", { token, targetWindowLabel }),
  getBootstrap: () => invokeDesktop<EditorWindowBootstrap>("get_editor_window_bootstrap"),
  create: (transferId: string, payload: unknown) =>
    invokeDesktop<EditorWindowBootstrap>("create_editor_window", {
      transferId,
      payload,
      ownerEpoch: editorWindowRuntime.ownerEpoch(),
    }),
  show: (targetWindowLabel: string) =>
    invokeDesktop<void>("show_editor_window", {
      targetWindowLabel,
      ownerEpoch: editorWindowRuntime.ownerEpoch(),
    }),
  discard: (targetWindowLabel: string, transferId: string) =>
    invokeDesktop<void>("discard_editor_window", {
      targetWindowLabel,
      transferId,
      ownerEpoch: editorWindowRuntime.ownerEpoch(),
    }),
  send: (targetWindowLabel: string, requestId: string, payload: unknown, ownerEpoch: number) =>
    invokeDesktop<void>("send_editor_window_message", {
      targetWindowLabel,
      requestId,
      payload,
      ownerEpoch,
    }),
  checkpoint: (ownerEpoch: number, checkpoint: unknown) =>
    invokeDesktop<void>("store_editor_window_checkpoint", { ownerEpoch, checkpoint }),
  async listen(handler: (message: EditorWindowMessage) => void): Promise<() => void> {
    if (!isDesktop() || !isTauri()) return () => {};
    return getCurrentWebviewWindow().listen<EditorWindowMessage>(
      "lonanote://editor-window-message",
      ({ payload }) => handler(payload),
    );
  },
};
