import { useMemo } from "react";
import { confirmNative } from "rn-ui-kit";

import { workspace } from "@/api/commands/workspace";
import {
  type EditorCloseTargets,
  createEditorCloseActions,
  getWorkspaceCloseTargets,
} from "@/components/editor/controllers/editor_close_actions";
import { saveCoordinator } from "@/components/editor/controllers/save_coordinator";

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
