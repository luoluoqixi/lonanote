import type {
  WorkspaceTransferEntryResult,
  WorkspaceTransferSource,
} from "@/api/commands/workspace/types";
import type { workspaceFile } from "@/api/commands/workspace/workspace_file";
import type { saveCoordinator } from "@/components/editor/controllers/save_coordinator";
import {
  type DocumentModel,
  canonicalizeWorkspaceFilePath,
  editorStore,
  isDocumentDirty,
} from "@/stores/editor";
import { normalizeTransferSources } from "@/stores/workspace/workspace_file_clipboard";

export type WorkspaceTransferResult = {
  cancelled: boolean;
  entries: WorkspaceTransferEntryResult[];
  refreshError: string | null;
};
export function createWorkspaceTransferActions(deps: {
  workspaceFile: Pick<typeof workspaceFile, "transfer" | "exists">;
  saveCoordinator: Pick<typeof saveCoordinator, "withDocumentMutation">;
  currentWorkspaceId(): string | null;
  confirmDirty(
    documents: DocumentModel[],
    operation: "move" | "copy",
  ): Promise<"save" | "discard" | "cancel">;
  confirmConflict(path: string): Promise<"keepBoth" | "overwrite" | "skip" | "cancel">;
  remapPath?(workspaceId: string, from: string, to: string): void;
  invalidatePaths(workspaceId: string, paths: string[]): Promise<void>;
}) {
  return {
    async transferEntries(input: {
      workspaceId: string;
      sources: WorkspaceTransferSource[];
      destinationDirectory: string;
      operation: "move" | "copy";
    }): Promise<WorkspaceTransferResult> {
      const { workspaceId, destinationDirectory, operation } = input;
      const result: WorkspaceTransferResult = { cancelled: false, entries: [], refreshError: null };
      const sources = normalizeTransferSources(input.sources);
      const assertCurrent = () => {
        if (deps.currentWorkspaceId() !== workspaceId)
          throw new Error("工作区已变化，文件操作已取消");
      };
      assertCurrent();
      for (const source of sources) canonicalizeWorkspaceFilePath(source.path);
      if (destinationDirectory) canonicalizeWorkspaceFilePath(destinationDirectory);
      const sameDirectory = (path: string) =>
        path.split("/").slice(0, -1).join("/") === destinationDirectory;
      const within = (p: string, root: string) => p === root || p.startsWith(`${root}/`);
      const affected = () =>
        Object.values(editorStore.getState().documentsById).filter(
          (d) =>
            d.ref.kind === "workspaceFile" &&
            d.ref.workspaceId === workspaceId &&
            sources.some((s) => d.ref.kind === "workspaceFile" && within(d.ref.filePath, s.path)),
        );
      const release = editorStore
        .getState()
        .reserveWorkspacePaths(workspaceId, [...sources.map((s) => s.path), destinationDirectory]);
      try {
        await deps.saveCoordinator.withDocumentMutation(
          affected().map((d) => d.documentId),
          async (context) => {
            await context.capture();
            const dirty = affected().filter(isDocumentDirty);
            const decision = dirty.length
              ? await deps.confirmDirty(
                  dirty,
                  sources.every((s) => sameDirectory(s.path)) ? "copy" : operation,
                )
              : "discard";
            if (decision === "cancel") {
              result.cancelled = true;
              return;
            }
            if (decision === "save" && (await context.save()) === "cancelled") {
              result.cancelled = true;
              return;
            }
            let policy: "keepBoth" | "overwrite" | "skip" | "error" = "error";
            for (const source of sources) {
              const name = source.path.split("/").at(-1)!;
              const target = destinationDirectory ? `${destinationDirectory}/${name}` : name;
              if (target === source.path) continue;
              if (await deps.workspaceFile.exists(workspaceId, target)) {
                const selected = await deps.confirmConflict(target);
                if (selected === "cancel") {
                  result.cancelled = true;
                  return;
                }
                policy = selected;
                break;
              }
            }
            assertCurrent();
            // 来源与目标都已预占；打开但已从磁盘删除的目标也不能被转移静默重建。
            const protectedPaths = [
              ...Object.values(editorStore.getState().documentsById),
              ...Object.values(editorStore.getState().viewersById),
            ].flatMap((doc) =>
              doc.ref.kind === "workspaceFile" &&
              doc.ref.workspaceId === workspaceId &&
              !sources.some((source) =>
                within(doc.ref.kind === "workspaceFile" ? doc.ref.filePath : "", source.path),
              )
                ? [doc.ref.filePath]
                : [],
            );
            result.entries = await deps.workspaceFile.transfer(
              workspaceId,
              sources,
              destinationDirectory,
              operation,
              policy,
              protectedPaths,
            );
            for (const item of result.entries) {
              if (
                item.status !== "succeeded" ||
                !item.targetPath ||
                operation !== "move" ||
                sameDirectory(item.sourcePath)
              )
                continue;
              if (decision === "discard") {
                for (const doc of affected())
                  if (doc.ref.kind === "workspaceFile" && within(doc.ref.filePath, item.sourcePath))
                    editorStore.getState().discardDocumentDraft(doc.documentId);
              }
              editorStore
                .getState()
                .renameWorkspacePath(workspaceId, item.sourcePath, item.targetPath);
              deps.remapPath?.(workspaceId, item.sourcePath, item.targetPath);
            }
          },
        );
      } finally {
        release();
      }
      const paths = result.entries
        .filter((r) => r.status === "succeeded")
        .flatMap((r) => [r.sourcePath, r.targetPath!]);
      if (paths.length)
        await deps.invalidatePaths(workspaceId, paths).catch((e) => {
          result.refreshError = e instanceof Error ? e.message : String(e);
        });
      return result;
    },
  };
}
