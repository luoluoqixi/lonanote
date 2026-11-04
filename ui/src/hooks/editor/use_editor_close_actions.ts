import { useMemo } from "react";
import { confirmNative } from "rn-ui-kit";

import { exitDesktopApp } from "@/api/commands/win/app_exit";
import { workspace } from "@/api/commands/workspace";
import {
  type EditorCloseTargets,
  createEditorCloseActions,
  getWorkspaceCloseTargets,
} from "@/components/editor/controllers/editor_close_actions";
import { saveCoordinator } from "@/components/editor/controllers/save_coordinator";
import { editorStore } from "@/stores/editor";

const actions = createEditorCloseActions({
  saveCoordinator,
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

// 单例串行协调所有入口，避免多处同时关闭引起重复确认或释放文档。
export function useEditorCloseActions() {
  return useMemo(
    () => ({
      requestAppExit: async () => {
        const state = editorStore.getState();
        const ids = [...state.openEditorIds];
        const documentIds = Object.keys(state.documentsById);
        const completed = await actions.close({ editorIds: ids, documentIds }, async () => {
          const latest = editorStore.getState();
          if (
            latest.openEditorIds.some((id) => !ids.includes(id)) ||
            Object.keys(latest.documentsById).some((id) => !documentIds.includes(id))
          )
            throw new Error("确认期间打开了新的文档，请重试");
          await exitDesktopApp();
        });
        return completed;
      },
      closeEditors: (editorIds: string[], options?: Pick<EditorCloseTargets, "savedOnly">) =>
        actions.close({ editorIds, ...options }),
      closeWorkspace: (workspaceId: string) =>
        actions.close(getWorkspaceCloseTargets(workspaceId), () => workspace.close(workspaceId)),
      withWorkspaceClose: (workspaceId: string, beforeClose: () => Promise<boolean | void>) =>
        actions.close(getWorkspaceCloseTargets(workspaceId), beforeClose),
    }),
    [],
  );
}
