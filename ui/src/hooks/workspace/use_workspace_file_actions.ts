import { useMemo } from "react";
import { confirmNative } from "rn-ui-kit";

import { workspaceFile } from "@/api/commands/workspace/workspace_file";
import { saveCoordinator } from "@/components/editor/controllers/save_coordinator";
import { useToast } from "@/hooks/ui";
import { workspaceExplorerStore } from "@/stores/workspace/workspace_explorer_runtime";

import {
  type WorkspaceFileActionResult,
  createWorkspaceFileActions,
} from "./workspace_file_actions";

export function useWorkspaceFileActions() {
  const { toast } = useToast();
  return useMemo(() => {
    const actions = createWorkspaceFileActions({
      workspaceFile,
      explorer: workspaceExplorerStore.getState(),
      saveCoordinator,
      confirmDirty: async (documents) => {
        const choice = await confirmNative({
          title: "保存更改？",
          message: `${documents.length} 个文档有未保存的更改。`,
          buttons: [
            { key: "save", text: "保存" },
            { key: "discard", text: "放弃更改", style: "destructive" },
            { key: "cancel", text: "取消", style: "cancel" },
          ],
        });
        return choice === "save" || choice === "discard" ? choice : "cancel";
      },
    });
    const report = (value: WorkspaceFileActionResult) => {
      if (value.failedPaths.length)
        toast.error(
          value.failedPaths.map((failure) => `${failure.path}: ${failure.error}`).join("\n"),
        );
      if (value.refreshError)
        toast.warning("文件操作已成功，刷新失败", { description: value.refreshError });
      return value;
    };
    return {
      createEntry: async (input: Parameters<typeof actions.createEntry>[0]) =>
        report(await actions.createEntry(input)),
      renameEntry: async (input: Parameters<typeof actions.renameEntry>[0]) =>
        report(await actions.renameEntry(input)),
      deleteEntries: async (input: Parameters<typeof actions.deleteEntries>[0]) =>
        report(await actions.deleteEntries(input)),
    };
  }, [toast]);
}
