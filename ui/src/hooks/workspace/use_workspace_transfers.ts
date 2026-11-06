import { useMemo, useSyncExternalStore } from "react";
import { confirmNative } from "rn-ui-kit";

import type { WorkspaceTransferSource } from "@/api/commands/workspace/types";
import { workspaceFile } from "@/api/commands/workspace/workspace_file";
import { saveCoordinator } from "@/components/editor/controllers/save_coordinator";
import { useToast } from "@/hooks/ui";
import { workspaceExplorerStore } from "@/stores/workspace/workspace_explorer_runtime";
import {
  workspaceFileClipboard as clipboard,
  normalizeTransferSources,
} from "@/stores/workspace/workspace_file_clipboard";
import { workspaceSessionStore } from "@/stores/workspace/workspace_session_store";

import { selectWorkspaceDirectory } from "./use_workspace_directory_picker";
import { createWorkspaceTransferActions } from "./workspace_transfer_actions";

workspaceSessionStore.subscribe((state) => clipboard.workspaceChanged(state.currentWorkspaceId));
let recordRequest = 0;

export function useWorkspaceTransfers(workspaceId: string) {
  const recordState = useSyncExternalStore(
    clipboard.subscribe,
    clipboard.getSnapshot,
    clipboard.getSnapshot,
  );
  const { toast } = useToast();
  const actions = useMemo(() => {
    const transfer = createWorkspaceTransferActions({
      workspaceFile,
      saveCoordinator,
      currentWorkspaceId: workspaceSessionStore.getCurrentWorkspaceId,
      invalidatePaths: workspaceExplorerStore.getState().invalidatePaths,
      remapPath: workspaceExplorerStore.getState().remapPath,
      confirmDirty: async (documents, operation) => {
        const choice = await confirmNative({
          title: "保存更改？",
          message: `${documents.length} 个文档有未保存的更改。\n${operation === "move" ? "不保存将放弃成功移动文档的更改。" : "不保存将复制磁盘内容，编辑草稿会保留。"}`,
          buttons: [
            { key: "save", text: "保存" },
            { key: "discard", text: "不保存", style: "destructive" },
            { key: "cancel", text: "取消", style: "cancel" },
          ],
        });
        return choice === "save" || choice === "discard" ? choice : "cancel";
      },
      confirmConflict: async (path) => {
        const choice = await confirmNative({
          title: "目标名称已存在",
          message: `${path}\n选择应用于本次所有重名项。覆盖会替换同名文件或整个目录，目录不会合并。`,
          buttons: [
            { key: "keepBoth", text: "保留两者" },
            { key: "overwrite", text: "覆盖", style: "destructive" },
            { key: "skip", text: "跳过" },
            { key: "cancel", text: "取消", style: "cancel" },
          ],
        });
        return choice === "keepBoth" || choice === "overwrite" || choice === "skip"
          ? choice
          : "cancel";
      },
    });
    const run = (operation: () => Promise<unknown>) => {
      void operation().catch((e) => toast.error(e instanceof Error ? e.message : String(e)));
    };
    const snapshot = (paths: string[]) =>
      Promise.all(
        normalizeTransferSources(paths.map((path) => ({ path }))).map(async ({ path }) => ({
          path,
          expectedMetadata: await workspaceFile.metadata(workspaceId, path),
        })),
      );
    const execute = async (
      sources: WorkspaceTransferSource[],
      destinationDirectory: string,
      operation: "move" | "copy",
      version?: number,
    ) => {
      const result = await transfer.transferEntries({
        workspaceId,
        sources,
        destinationDirectory,
        operation,
      });
      const succeeded = result.entries
        .filter((e) => e.status === "succeeded")
        .map((e) => e.sourcePath);
      if (version !== undefined) clipboard.consumeSucceeded(version, succeeded);
      if (operation === "move") clipboard.invalidateSources(workspaceId, succeeded);
      const errors = result.entries.filter((e) => e.status === "failed");
      if (errors.length) toast.error(errors.map((e) => `${e.sourcePath}: ${e.error}`).join("\n"));
      const warnings = result.entries.flatMap((e) => (e.cleanupError ? [e.cleanupError] : []));
      if (warnings.length)
        toast.warning("文件操作已成功，清理失败", { description: warnings.join("\n") });
      if (result.refreshError)
        toast.warning("文件操作已成功，刷新失败", { description: result.refreshError });
    };
    return {
      move: (paths: string[], directory: string) =>
        run(async () => {
          const sources = await snapshot(paths);
          await execute(sources, directory, "move");
        }),
      record: (paths: string[], mode: "cut" | "copy") => {
        const request = ++recordRequest;
        run(async () => {
          const sources = await snapshot(paths);
          if (
            request === recordRequest &&
            workspaceSessionStore.getCurrentWorkspaceId() === workspaceId
          )
            clipboard.record(workspaceId, mode, sources);
        });
      },
      choose: (paths: string[], operation: "move" | "copy") =>
        run(async () => {
          const sources = await snapshot(paths);
          const selected = await selectWorkspaceDirectory({
            workspaceId,
            purpose: operation,
            sourceCount: sources.length,
            excludedPaths: sources
              .filter((s) => s.expectedMetadata.kind === "directory")
              .map((s) => s.path),
          });
          if (selected) await execute(sources, selected.directory, operation);
        }),
      paste: (directory: string) => {
        const value = clipboard.getSnapshot();
        if (value?.workspaceId === workspaceId)
          run(() =>
            execute(
              value.sources,
              directory,
              value.mode === "cut" ? "move" : "copy",
              value.version,
            ),
          );
      },
    };
  }, [workspaceId, toast]);
  return {
    ...actions,
    recordState,
    canPaste: recordState?.workspaceId === workspaceId && recordState.sources.length > 0,
    cutPaths:
      recordState?.workspaceId === workspaceId && recordState.mode === "cut"
        ? recordState.sources.map((s) => s.path)
        : [],
  };
}
