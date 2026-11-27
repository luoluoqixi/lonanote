import { useMemo } from "react";
import { confirmNative } from "rn-ui-kit";

import { store } from "@/api/commands/store";
import { exitDesktopApp } from "@/api/commands/win/app_exit";
import { workspace } from "@/api/commands/workspace";
import { isDesktop, isTauri } from "@/api/common/platform";
import { createClosePreparation } from "@/api/common/window_close_preparation";
import { flushWindowSize } from "@/api/common/window_size_recorder";
import {
  type EditorCloseTargets,
  createEditorCloseActions,
  getWorkspaceCloseTargets,
} from "@/components/editor/controllers/editor_close_actions";
import {
  createRemoteWindowCloseRegistry,
  prepareAuxiliaryWindowClose,
} from "@/components/editor/controllers/editor_window_close";
import { editorWindowRuntime } from "@/components/editor/controllers/editor_window_runtime";
import { saveCoordinator } from "@/components/editor/controllers/save_coordinator";
import { editorStore } from "@/stores/editor";
import { workspaceSessionStore } from "@/stores/workspace";

const actions = createEditorCloseActions({
  saveCoordinator,
  focusConfirmationWindow: async () => {
    if (!isDesktop() || !isTauri()) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const owner = getCurrentWindow();
    await owner.unminimize();
    await owner.show();
    await owner.setFocus();
  },
  confirmDirty: async (documents) => {
    const choice = await confirmNative({
      title: "保存更改？",
      message: `${documents.length} 个文档有未保存的更改。\n${documents
        .map((d) => d.title)
        .slice(0, 5)
        .join("\n")}`,
      buttons: [
        { key: "save", text: "保存" },
        { key: "discard", text: "放弃更改", style: "destructive" },
        { key: "cancel", text: "取消", style: "cancel" },
      ],
    });
    return choice === "save" || choice === "discard" ? choice : "cancel";
  },
});

const remoteClosePreparations = createRemoteWindowCloseRegistry();

/** RPC 身份及视图归属由 editorWindowService 校验，owner 持有唯一确认事务。 */
export async function prepareRemoteEditorWindowClose(
  requestId: string,
  editorIds: string[],
  windowLabel?: string,
): Promise<boolean> {
  const memberLabel = windowLabel ?? editorStore.getState().editorsById[editorIds[0]]?.windowLabel;
  if (!memberLabel) throw new Error("关闭事务缺少辅助窗口身份");
  return remoteClosePreparations.prepare(requestId, memberLabel, () =>
    createClosePreparation((waitForCommit, signal) =>
      actions.close({ editorIds }, waitForCommit, signal),
    ),
  );
}

export async function finishRemoteEditorWindowClose(
  requestId: string,
  commit: boolean,
  windowLabel?: string,
): Promise<boolean> {
  return remoteClosePreparations.finish(requestId, commit, windowLabel);
}

export const abortRemoteEditorWindowClose = remoteClosePreparations.abort;

export function closeEditorWindowViews(
  editorIds: string[],
  options?: Pick<EditorCloseTargets, "savedOnly">,
) {
  return actions.close({ editorIds, ...options });
}
async function closeViews(
  editorIds: string[],
  options?: Pick<EditorCloseTargets, "savedOnly">,
): Promise<boolean> {
  if (editorWindowRuntime.isRemote()) {
    const { editorWindowService } =
      await import("@/components/editor/controllers/editor_window_service");
    return (await editorWindowService.requestOwner("close", { editorIds, ...options })) as boolean;
  }
  return closeEditorWindowViews(editorIds, options);
}
// 单例串行协调所有入口，避免多处同时关闭引起重复确认或释放文档。
export function useEditorCloseActions() {
  return useMemo(
    () => ({
      requestAppExit: exitDesktopApp,
      closeEditors: (editorIds: string[], options?: Pick<EditorCloseTargets, "savedOnly">) =>
        closeViews(editorIds, options),
      closeWorkspace: (workspaceId: string) =>
        actions.close(getWorkspaceCloseTargets(workspaceId), () => workspace.close(workspaceId)),
      withWorkspaceClose: (workspaceId: string, beforeClose: () => Promise<boolean | void>) =>
        actions.close(getWorkspaceCloseTargets(workspaceId), beforeClose),
    }),
    [],
  );
}

/** 保留 mutation 屏障直到 Rust 协调器决定提交或取消。 */
export function prepareCurrentWindowClose(options?: { requestId: string; closingOwner: boolean }) {
  const state = editorStore.getState();
  if (editorWindowRuntime.isRemote()) {
    if (!options) throw new Error("辅助窗口关闭缺少会话上下文");
    const getService = async () =>
      (await import("@/components/editor/controllers/editor_window_service")).editorWindowService;
    return prepareAuxiliaryWindowClose({
      ...options,
      editorIds: [...state.openEditorIds],
      isOwnerDestroyed: async () => !!(await getService()).getBootstrapSnapshot()?.ownerDestroyed,
      confirmOrphanedClose: async () => {
        const choice = await confirmNative({
          title: "关闭保留草稿？",
          message:
            "原窗口已意外关闭，此窗口无法再保存。关闭后，尚未复制的草稿将丢失。请先复制保留的草稿。",
          buttons: [
            { key: "copy", text: "复制草稿并关闭" },
            { key: "discard", text: "已复制，放弃并关闭", style: "destructive" },
            { key: "cancel", text: "取消", style: "cancel" },
          ],
        });
        return choice === "copy" || choice === "discard" ? choice : "cancel";
      },
      copyRecoveryDraft: async () => {
        const text = await (await getService()).getRecoveryDraft();
        const { clipboard } = await import("@/api/commands/system/clipboard");
        await clipboard.writeText(text);
      },
      flush: async () => (await getService()).flushRemoteInputs(),
      prepareOwner: async (requestId, editorIds) =>
        (await getService()).requestOwner("prepare-close", {
          requestId,
          editorIds,
        }) as Promise<boolean>,
      finishOwner: async (requestId, commit) =>
        (await getService()).requestOwner("finish-close", {
          requestId,
          commit,
        }) as Promise<boolean>,
    });
  }
  const editorIds = [...Object.keys(state.editorsById), ...Object.keys(state.viewersById)];
  const documentIds = Object.keys(state.documentsById);
  return createClosePreparation((waitForCommit, signal) =>
    actions.close(
      { editorIds, documentIds },
      async () => {
        const latest = editorStore.getState();
        if (
          [...Object.keys(latest.editorsById), ...Object.keys(latest.viewersById)].some(
            (id) => !editorIds.includes(id),
          ) ||
          Object.keys(latest.documentsById).some((id) => !documentIds.includes(id))
        ) {
          throw new Error("确认期间打开了新的文档，请重试");
        }
        await flushWindowSize();
        await store.commonSave();
        const workspaceId = workspaceSessionStore.getCurrentWorkspaceId();
        if (workspaceId) await workspace.flushState(workspaceId);
        return waitForCommit();
      },
      signal,
    ),
  );
}
