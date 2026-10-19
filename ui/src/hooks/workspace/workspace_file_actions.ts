import type { workspaceFile } from "@/api/commands/workspace/workspace_file";
import { ensureNewNoteFileExtension } from "@/api/common/utils/file_type_utils";
import type { saveCoordinator } from "@/components/editor/controllers/save_coordinator";
import {
  type DocumentModel,
  canonicalizeWorkspaceFilePath,
  editorStore,
  isDocumentDirty,
} from "@/stores/editor";
import { isPathWithin } from "@/stores/workspace/workspace_explorer_store";

export type WorkspaceFileActionResult = {
  cancelled: boolean;
  succeededPaths: string[];
  failedPaths: { path: string; error: string }[];
  refreshError: string | null;
};
type Dependencies = {
  workspaceFile: Pick<
    typeof workspaceFile,
    "exists" | "writeText" | "createDirectory" | "rename" | "remove"
  >;
  explorer: { invalidatePaths: (workspaceId: string, paths: string[]) => Promise<void> };
  saveCoordinator: Pick<typeof saveCoordinator, "withDocumentMutation">;
  confirmDirty: (documents: DocumentModel[]) => Promise<"save" | "discard" | "cancel">;
};
const result = (): WorkspaceFileActionResult => ({
  cancelled: false,
  succeededPaths: [],
  failedPaths: [],
  refreshError: null,
});
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function createWorkspaceFileActions(deps: Dependencies) {
  const documentsFor = (id: string, paths: string[]) =>
    Object.values(editorStore.getState().documentsById).filter(
      (d) =>
        d.ref.kind === "workspaceFile" &&
        d.ref.workspaceId === id &&
        paths.some((p) => d.ref.kind === "workspaceFile" && isPathWithin(d.ref.filePath, p)),
    );
  async function refresh(id: string, paths: string[], value: WorkspaceFileActionResult) {
    if (!value.succeededPaths.length) return;
    try {
      await deps.explorer.invalidatePaths(id, paths);
    } catch (error) {
      value.refreshError = errorMessage(error);
    }
  }
  async function mutate(
    id: string,
    paths: string[],
    operation: (path: string, discard: boolean) => Promise<void>,
    reservedPaths = paths,
  ) {
    const value = result();
    let release: (() => void) | undefined;
    try {
      for (const p of reservedPaths)
        if (canonicalizeWorkspaceFilePath(p) !== p) throw new Error("文件路径无效");
      release = editorStore.getState().reserveWorkspacePaths(id, reservedPaths);
      const ids = documentsFor(id, paths).map((d) => d.documentId);
      await deps.saveCoordinator.withDocumentMutation(ids, async (context) => {
        await context.capture();
        const dirty = documentsFor(id, paths).filter(isDocumentDirty);
        const decision = dirty.length ? await deps.confirmDirty(dirty) : "discard";
        if (decision === "cancel") {
          value.cancelled = true;
          return;
        }
        if (decision === "save") await context.save();
        for (const path of paths) {
          try {
            await operation(path, decision === "discard");
            value.succeededPaths.push(path);
          } catch (error) {
            value.failedPaths.push({ path, error: errorMessage(error) });
          }
        }
      });
    } catch (error) {
      for (const path of paths)
        if (
          !value.succeededPaths.includes(path) &&
          !value.failedPaths.some((failure) => failure.path === path)
        )
          value.failedPaths.push({ path, error: errorMessage(error) });
    } finally {
      release?.();
    }
    return value;
  }
  return {
    createEntry: async ({
      workspaceId,
      parentPath,
      name,
      kind,
    }: {
      workspaceId: string;
      parentPath: string;
      name: string;
      kind: "note" | "directory";
    }) => {
      const value = result();
      const trimmed = name.trim();
      const filename = kind === "note" ? ensureNewNoteFileExtension(trimmed) : trimmed;
      const path = parentPath ? `${parentPath}/${filename}` : filename;
      try {
        if (
          !trimmed ||
          trimmed === "." ||
          trimmed === ".." ||
          /[\\/]/.test(trimmed) ||
          [...trimmed].some((c) => c.charCodeAt(0) < 32)
        )
          throw new Error("名称无效，不能包含路径分隔符");
        if (await deps.workspaceFile.exists(workspaceId, path)) throw new Error("目标路径已存在");
        if (kind === "note")
          await deps.workspaceFile.writeText(workspaceId, path, "", {
            overwrite: false,
            createParent: false,
          });
        else await deps.workspaceFile.createDirectory(workspaceId, path);
        value.succeededPaths.push(path);
      } catch (error) {
        value.failedPaths.push({ path, error: errorMessage(error) });
      }
      await refresh(workspaceId, [path], value);
      return value;
    },
    renameEntry: async ({
      workspaceId,
      path,
      nextPath,
    }: {
      workspaceId: string;
      path: string;
      nextPath: string;
    }) => {
      const value = await mutate(
        workspaceId,
        [path],
        async (_, discard) => {
          // 提交 Storage 前再次核对身份，确认期间可能打开了目标文件。
          editorStore.getState().assertWorkspaceRename(workspaceId, path, nextPath);
          if (await deps.workspaceFile.exists(workspaceId, nextPath))
            throw new Error("目标路径已存在");
          await deps.workspaceFile.rename(workspaceId, path, nextPath);
          if (discard)
            for (const d of documentsFor(workspaceId, [path]))
              editorStore.getState().discardDocumentDraft(d.documentId);
          editorStore.getState().renameWorkspacePath(workspaceId, path, nextPath);
        },
        [path, nextPath],
      );
      await refresh(workspaceId, [path, nextPath], value);
      return value;
    },
    deleteEntries: async ({ workspaceId, paths }: { workspaceId: string; paths: string[] }) => {
      const unique = [...new Set(paths)].filter(
        (p, _, all) => !all.some((ancestor) => ancestor !== p && isPathWithin(p, ancestor)),
      );
      const value = await mutate(workspaceId, unique, async (path) => {
        await deps.workspaceFile.remove(workspaceId, path, true);
        editorStore.getState().removeWorkspacePaths(workspaceId, [path]);
      });
      await refresh(workspaceId, value.succeededPaths, value);
      return value;
    },
  };
}
