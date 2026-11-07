import { useEffect, useRef } from "react";

import { isDesktop, isTauri } from "@/api/common/platform";
import {
  holdWindowCloseBarrier,
  releaseWindowCloseBarrier,
} from "@/api/common/window_close_preparation";
import {
  type WindowCloseMessage,
  routeWindowCloseMessage,
} from "@/api/common/window_close_routing";
import { useToast } from "@/hooks/ui";
import { editorStore } from "@/stores/editor";
import { workspaceCatalogRevisionStore } from "@/stores/workspace/workspace_catalog_revision";

import {
  abortRemoteEditorWindowClose,
  prepareCurrentWindowClose,
} from "./use_editor_close_actions";

type CloseMessage = WindowCloseMessage;
type MemberCloseMessage = {
  windowLabel: string;
  ownerWindowLabel: string;
  sessionId: string;
  ownerEpoch: number;
  requestId: string | null;
};

export function useDesktopWindowLifecycle() {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  useEffect(() => {
    if (!isTauri() || !isDesktop()) return;
    let disposed = false;
    const transactions = new Map<string, ReturnType<typeof prepareCurrentWindowClose>>();
    const barriers = new Set<string>();
    const cleanups: (() => void)[] = [];
    const refreshCatalog = () =>
      workspaceCatalogRevisionStore.setState((state) => ({ revision: state.revision + 1 }));
    const initialize = async () => {
      const [{ getCurrentWebviewWindow }, { invoke }] = await Promise.all([
        import("@tauri-apps/api/webviewWindow"),
        import("@tauri-apps/api/core"),
      ]);
      if (disposed) return;
      const appWindow = getCurrentWebviewWindow();
      const abortRemotePreparation = async ({ payload }: { payload: MemberCloseMessage }) => {
        const { editorWindowService } =
          await import("@/components/editor/controllers/editor_window_service");
        const bootstrap = editorWindowService.getBootstrapSnapshot();
        if (
          !bootstrap ||
          bootstrap.role !== "workbench" ||
          payload.ownerWindowLabel !== appWindow.label ||
          payload.sessionId !== bootstrap.sessionId ||
          payload.ownerEpoch !== bootstrap.ownerEpoch
        )
          return;
        await abortRemoteEditorWindowClose(payload.windowLabel, payload.requestId);
      };
      const handle = async ({ requestId, stage, closingOwner = false }: CloseMessage) => {
        if (stage === "abort") {
          await transactions.get(requestId)?.finish(false);
          transactions.delete(requestId);
          releaseWindowCloseBarrier(requestId);
          barriers.delete(requestId);
          await invoke("respond_window_close", { requestId, stage, accepted: true });
          return;
        }
        let accepted = true;
        try {
          if (stage === "barrier") {
            holdWindowCloseBarrier(requestId);
            barriers.add(requestId);
          } else if (stage === "prepare") {
            const transaction = prepareCurrentWindowClose({ requestId, closingOwner });
            transactions.set(requestId, transaction);
            accepted = await transaction.ready;
            const error = transaction.getError();
            if (!accepted && error)
              toastRef.current.error("无法关闭窗口", {
                description: error instanceof Error ? error.message : String(error),
              });
          } else {
            accepted = (await transactions.get(requestId)?.finish(true)) ?? false;
            transactions.delete(requestId);
          }
        } catch (error) {
          accepted = false;
          console.error("[window-close] 窗口关闭失败", error);
        }
        await invoke("respond_window_close", { requestId, stage, accepted });
      };
      const listeners = await Promise.all([
        appWindow.listen<MemberCloseMessage>(
          "lonanote://editor-window-owner-destroyed",
          ({ payload }) => {
            void (async () => {
              const { editorWindowService } =
                await import("@/components/editor/controllers/editor_window_service");
              const bootstrap = editorWindowService.getBootstrapSnapshot();
              if (
                !bootstrap ||
                bootstrap.role !== "editor" ||
                payload.windowLabel !== appWindow.label ||
                payload.ownerWindowLabel !== bootstrap.ownerWindowLabel ||
                payload.sessionId !== bootstrap.sessionId ||
                payload.ownerEpoch !== bootstrap.ownerEpoch
              )
                return;
              for (const transaction of transactions.values()) void transaction.finish(false);
              transactions.clear();
              for (const id of barriers) releaseWindowCloseBarrier(id);
              barriers.clear();
              await editorWindowService.handleOwnerDestroyed();
            })().catch((error) => console.error("[editor-window] 保留原窗口失联草稿失败", error));
          },
        ),
        appWindow.listen<MemberCloseMessage>(
          "lonanote://editor-window-member-destroyed",
          (event) => {
            void abortRemotePreparation(event).catch((error) =>
              console.error("[window-close] 释放远端关闭屏障失败", error),
            );
          },
        ),
        appWindow.listen<MemberCloseMessage>("lonanote://editor-window-close-aborted", (event) => {
          void abortRemotePreparation(event).catch((error) =>
            console.error("[window-close] 撤销远端关闭失败", error),
          );
        }),
        appWindow.listen<CloseMessage>("lonanote://window-close", (event) => {
          void routeWindowCloseMessage(appWindow.label, event.payload, handle).catch((error) =>
            console.error("[window-close] 确认响应失败", error),
          );
        }),
        appWindow.listen("lonanote://workspace-catalog-changed", refreshCatalog),
        appWindow.listen<string>("lonanote://focus-document", ({ payload }) => {
          const editorId = editorStore.getState().documentsById[payload]?.attachedEditorIds[0];
          if (editorId) editorStore.getState().setActiveEditor(editorId);
        }),
        appWindow.onFocusChanged(({ payload }) => {
          if (payload) refreshCatalog();
        }),
      ]);
      if (disposed) listeners.forEach((stop) => stop());
      else cleanups.push(...listeners);
    };
    void initialize().catch((error) => console.error("[window-lifecycle] 注册事件失败", error));
    return () => {
      disposed = true;
      cleanups.forEach((stop) => stop());
      for (const transaction of transactions.values()) void transaction.finish(false);
      for (const id of barriers) releaseWindowCloseBarrier(id);
    };
  }, []);
}
