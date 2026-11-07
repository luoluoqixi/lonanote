import type { DocumentModel, EditorDocumentRef } from "@/stores/editor/editor_document_types";

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
  root(id: string): Promise<string | null>;
  dialog(options: {
    defaultDirectory: string | null;
    defaultFileName: string;
  }): Promise<string | null>;
  prepare(path: string): Promise<SaveTarget | null>;
  directory(id: string, fileName: string): Promise<{ directory: string; fileName?: string } | null>;
  nativeTarget(id: string, path: string): Promise<SaveTarget>;
};

const markdownName = (name: string) => (/\.[^./\\]+$/.test(name) ? name : `${name}.md`);

export async function chooseUntitledSaveTargetWith(
  document: Pick<DocumentModel, "title">,
  deps: TargetDependencies,
): Promise<SaveTarget | null> {
  const fileName = markdownName(document.title);
  if (deps.tauri) {
    const root = deps.workspaceId ? await deps.root(deps.workspaceId).catch(() => null) : null;
    const path = await deps.dialog({ defaultDirectory: root, defaultFileName: fileName });
    return path ? deps.prepare(markdownName(path)) : null;
  }
  if (!deps.workspaceId) throw new Error("请先打开工作区，再保存笔记");
  const selected = await deps.directory(deps.workspaceId, fileName);
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
      const assertWorkspace = () => {
        if (workspaceSessionStore.getCurrentWorkspaceId() !== workspaceId)
          throw new Error("工作区已变化，请重新保存");
      };
      return chooseUntitledSaveTargetWith(document, {
        tauri: isTauri(),
        workspaceId,
        root: (id) => workspace.nativeRootPath(id),
        dialog: async (options) =>
          (
            await fs.showSelectDialog(
              { ...options, type: "saveFile", title: "保存笔记" },
              getDocumentSaveWindow(document.documentId),
            )
          )?.path ?? null,
        prepare: async (absolutePath) => {
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
            if (prepared.exists) {
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
        directory: async (id, suggestedFileName) => {
          const { selectWorkspaceDirectory } =
            await import("@/hooks/workspace/use_workspace_directory_picker");
          return selectWorkspaceDirectory({ workspaceId: id, purpose: "save", suggestedFileName });
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
