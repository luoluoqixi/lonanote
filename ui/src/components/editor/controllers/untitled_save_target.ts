import type { DocumentModel, EditorDocumentRef } from "@/stores/editor/editor_document_types";
import type { ExplorerWorkspace } from "@/stores/workspace/workspace_explorer_store";

import { getDocumentSaveWindow } from "./document_save_window";
import { editorWindowRuntime } from "./editor_window_runtime";

export type SaveTarget = {
  reference: Exclude<EditorDocumentRef, { kind: "untitled" }>;
  commit(text: string): Promise<void>;
  abort(): Promise<void>;
};
type TargetDependencies = {
  tauri: boolean;
  workspaceId: string | null;
  selectedDirectory?: string;
  root(id: string): Promise<string | null>;
  dialog(options: {
    defaultDirectory: string | null;
    defaultFileName: string;
  }): Promise<{ path: string; overwriteConfirmed?: boolean } | null>;
  prepare(path: string, options: { overwriteConfirmed: boolean }): Promise<SaveTarget | null>;
  directory(
    id: string,
    fileName: string,
    initialPath: string,
  ): Promise<{ directory: string; fileName?: string } | null>;
  nativeTarget(id: string, path: string): Promise<SaveTarget>;
};

const markdownName = (name: string) => (/\.[^./\\]+$/.test(name) ? name : `${name}.md`);

/** 仅选中文件夹参与保存目录选择；多选时优先焦点文件夹，否则使用首个选中文件夹。 */
export function selectedSaveDirectory(explorer?: ExplorerWorkspace): string {
  if (!explorer) return "";
  const directories = new Set(
    Object.values(explorer.directories)
      .flatMap((directory) => directory.snapshot?.entries ?? [])
      .filter((entry) => entry.fileType === "directory")
      .map((entry) => entry.path),
  );
  const selected = explorer.selectedPaths.filter((path) => directories.has(path));
  return explorer.focusedPath && selected.includes(explorer.focusedPath)
    ? explorer.focusedPath
    : (selected[0] ?? "");
}

export async function chooseUntitledSaveTargetWith(
  document: Pick<DocumentModel, "title">,
  deps: TargetDependencies,
): Promise<SaveTarget | null> {
  const fileName = markdownName(document.title);
  const initialPath = deps.workspaceId ? (deps.selectedDirectory ?? "") : "";
  if (deps.tauri) {
    const root = deps.workspaceId ? await deps.root(deps.workspaceId).catch(() => null) : null;
    const separator = root?.includes("\\") ? "\\" : "/";
    const defaultDirectory =
      root && initialPath
        ? `${root.replace(/[\\/]+$/, "")}${separator}${initialPath.replace(/\//g, separator)}`
        : root;
    const selected = await deps.dialog({ defaultDirectory, defaultFileName: fileName });
    if (!selected) return null;
    const path = markdownName(selected.path);
    // 自动补扩展名后可能指向另一个已有文件，不能沿用原路径的覆盖确认。
    return deps.prepare(path, {
      overwriteConfirmed: selected.overwriteConfirmed === true && path === selected.path,
    });
  }
  if (!deps.workspaceId) throw new Error("请先打开工作区，再保存笔记");
  const selected = await deps.directory(deps.workspaceId, fileName, initialPath);
  if (!selected) return null;
  const name = markdownName(selected.fileName ?? fileName);
  return deps.nativeTarget(
    deps.workspaceId,
    selected.directory ? `${selected.directory}/${name}` : name,
  );
}

// 同一窗口的系统对话框及目录选择请求串行，全部保存不会同时弹出多个目标选择。
let selectionQueue: Promise<unknown> = Promise.resolve();
export function chooseUntitledSaveTarget(document: DocumentModel): Promise<SaveTarget | null> {
  const task = selectionQueue
    .catch(() => {})
    .then(async () => {
      const [{ isTauri }, { workspaceSessionStore }, { workspaceFile, workspace }, { fs }] =
        await Promise.all([
          import("@/api/common/platform"),
          import("@/stores/workspace"),
          import("@/api/commands/workspace"),
          import("@/api/commands/fs"),
        ]);
      const workspaceId = workspaceSessionStore.getCurrentWorkspaceId();
      const selectedDirectory = workspaceId
        ? selectedSaveDirectory(
            (
              await import("@/stores/workspace/workspace_explorer_runtime")
            ).workspaceExplorerStore.getState().workspaces[workspaceId],
          )
        : "";
      const assertWorkspace = () => {
        if (workspaceSessionStore.getCurrentWorkspaceId() !== workspaceId)
          throw new Error("工作区已变化，请重新保存");
      };
      return chooseUntitledSaveTargetWith(document, {
        tauri: isTauri(),
        workspaceId,
        selectedDirectory,
        root: (id) => workspace.nativeRootPath(id),
        dialog: async (options) => {
          const selected = await fs.showSelectDialog(
            { ...options, type: "saveFile", title: "保存笔记" },
            getDocumentSaveWindow(document.documentId),
          );
          return selected?.path
            ? { path: selected.path, overwriteConfirmed: selected.overwriteConfirmed }
            : null;
        },
        prepare: async (absolutePath, options) => {
          assertWorkspace();
          const { invoke } = await import("@tauri-apps/api/core");
          const prepared = await invoke<{
            token: string;
            reference: SaveTarget["reference"];
            exists: boolean;
          }>("prepare_document_save_target", {
            ownerEpoch: editorWindowRuntime.ownerEpoch(),
            documentId: document.documentId,
            leaseId: `${document.documentId}:${document.identityRevision + 1}`,
            absolutePath,
          });
          const abort = () =>
            invoke<void>("abort_document_save_target", {
              token: prepared.token,
              ownerEpoch: editorWindowRuntime.ownerEpoch(),
            });
          try {
            if (prepared.exists && !options.overwriteConfirmed) {
              const { confirmNative } = await import("rn-ui-kit");
              const choice = await confirmNative({
                title: "覆盖已有文件？",
                message: absolutePath,
                buttons: [
                  { key: "overwrite", text: "覆盖", style: "destructive" },
                  { key: "cancel", text: "取消", style: "cancel" },
                ],
              });
              if (choice !== "overwrite") {
                await abort();
                return null;
              }
            }
            return {
              reference: prepared.reference,
              abort,
              commit: async (text) => {
                assertWorkspace();
                await invoke("commit_document_save_target", {
                  token: prepared.token,
                  ownerEpoch: editorWindowRuntime.ownerEpoch(),
                  text,
                  overwrite: prepared.exists,
                });
              },
            };
          } catch (error) {
            await abort();
            throw error;
          }
        },
        directory: async (id, suggestedFileName, initialPath) => {
          const { selectWorkspaceDirectory } =
            await import("@/hooks/workspace/use_workspace_directory_picker");
          return selectWorkspaceDirectory({
            workspaceId: id,
            purpose: "save",
            suggestedFileName,
            initialPath,
          });
        },
        nativeTarget: async (id, path) => {
          assertWorkspace();
          if (!(await workspaceFile.capabilities(id)).canWrite) throw new Error("当前工作区不可写");
          if (await workspaceFile.exists(id, path)) throw new Error("目标已存在，请重新选择文件名");
          return {
            reference: { kind: "workspaceFile", workspaceId: id, filePath: path },
            abort: async () => {},
            commit: async (text) => {
              assertWorkspace();
              await workspaceFile.writeText(id, path, text, {
                overwrite: false,
                createParent: false,
              });
            },
          };
        },
      });
    });
  selectionQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}
