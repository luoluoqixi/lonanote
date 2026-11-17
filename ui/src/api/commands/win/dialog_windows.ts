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
  async open<TDialogId extends DialogId>(
    request: DialogWindowRequest<TDialogId>,
  ): Promise<DialogWindowResultMap[TDialogId] | undefined> {
    assertDesktop();
    const current = getCurrentWebviewWindow();
    type Result = DialogWindowResultMap[TDialogId];
    let resolveResult!: (value: Result | undefined) => void;
    const result = new Promise<Result | undefined>((resolve) => {
      resolveResult = resolve;
    });
    let activeRequestId = request.requestId;
    const unlisten = await current.listen<{ requestId: string; result?: DialogJsonValue }>(
      "lonanote://dialog-window-result",
      ({ payload }) => {
        if (payload.requestId !== activeRequestId) return;
        unlisten?.();
        resolveResult(payload.result as Result | undefined);
      },
    );
    try {
      const created = await invoke<{ requestId: string }>("create_dialog_window", {
        request: { ...request, blockParentInput: request.blockParentInput ?? false },
      });
      activeRequestId = created.requestId;
    } catch (error) {
      unlisten();
      throw error;
    }
    return result;
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
