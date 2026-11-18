import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import type {
  DialogId,
  DialogJsonValue,
  DialogWindowRequest,
  DialogWindowResultMap,
  DialogWindowSession,
} from "@/api/common/dialogs/dialog_types";
import { isDesktop, isTauri } from "@/api/common/platform";

export type { DialogWindowRequest, DialogWindowSession } from "@/api/common/dialogs/dialog_types";

function assertDesktop() {
  if (!isDesktop() || !isTauri()) throw new Error("当前平台不支持原生 Dialog 窗口");
}

export const dialogWindows = {
  async dismissOwned(requestId: string): Promise<void> {
    assertDesktop();
    await invoke("dismiss_owned_dialog", { requestId });
  },
  async publishView(requestId: string, data: unknown): Promise<void> {
    assertDesktop();
    await invoke("publish_dialog_view", { requestId, data });
  },
  async dispatchAction(requestId: string, data: unknown): Promise<void> {
    assertDesktop();
    await invoke("dispatch_dialog_action", { requestId, data });
  },
  async listen<T>(kind: "view" | "action", requestId: string, receive: (data: T) => void) {
    assertDesktop();
    return getCurrentWebviewWindow().listen<{ requestId: string; data: T }>(
      `lonanote://dialog-${kind}`,
      ({ payload }) => {
        if (payload.requestId === requestId) receive(payload.data);
      },
    );
  },
  async open<TDialogId extends DialogId>(
    request: DialogWindowRequest<TDialogId>,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<DialogWindowResultMap[TDialogId] | undefined> {
    assertDesktop();
    if (signal?.aborted) return undefined;
    const current = getCurrentWebviewWindow();
    type Result = DialogWindowResultMap[TDialogId];
    let resolveResult!: (value: Result | undefined) => void;
    const result = new Promise<Result | undefined>((resolve) => {
      resolveResult = resolve;
    });
    let activeRequestId = request.requestId;
    let created = false;
    let settled = false;
    const unlisten = await current.listen<{ requestId: string; result?: DialogJsonValue }>(
      "lonanote://dialog-window-result",
      ({ payload }) => {
        if (payload.requestId !== activeRequestId) return;
        settled = true;
        resolveResult(payload.result as Result | undefined);
      },
    );
    const cancel = () => {
      // create 还未返回时先记住取消状态，创建成功后再关闭，避免请求不存在而漏关。
      if (!created || settled) return;
      settled = true;
      void dialogWindows
        .dismissOwned(activeRequestId)
        .catch(console.error)
        .finally(() => resolveResult(undefined));
    };
    signal?.addEventListener("abort", cancel, { once: true });
    try {
      if (signal?.aborted) return undefined;
      const response = await invoke<{ requestId: string }>("create_dialog_window", {
        request: { ...request, blockParentInput: request.blockParentInput ?? false },
      });
      activeRequestId = response.requestId;
      created = true;
      if (signal?.aborted) cancel();
      return await result;
    } catch (error) {
      if (signal?.aborted) return undefined;
      if (settled) return await result;
      throw error;
    } finally {
      signal?.removeEventListener("abort", cancel);
      unlisten();
    }
  },
  async getRequest<TDialogId extends DialogId = DialogId>(
    requestId: string,
  ): Promise<DialogWindowSession<TDialogId>> {
    assertDesktop();
    return invoke<DialogWindowSession<TDialogId>>("get_dialog_window_request", { requestId });
  },
  async complete(requestId: string, result?: DialogJsonValue): Promise<void> {
    assertDesktop();
    await invoke("complete_dialog_window", { requestId, result: result ?? null });
  },
  async closeCurrent(): Promise<void> {
    assertDesktop();
    await getCurrentWebviewWindow().close();
  },
};
