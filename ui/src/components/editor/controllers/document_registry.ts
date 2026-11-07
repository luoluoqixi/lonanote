import { fs } from "@/api/commands/fs";
import {
  claimDocumentFile,
  documentLeaseId,
  releaseDocumentFile,
  releaseDocumentOwnership,
} from "@/api/commands/win/file_ownership";
import { workspaceFile } from "@/api/commands/workspace";
import { isDesktop } from "@/api/common/platform";
import {
  type EditorDocumentRef,
  type OpenEditorOptions,
  type OpenEditorResult,
  editorStore,
} from "@/stores/editor";

import { editorWindowRuntime } from "./editor_window_runtime";

const documentLoadTasks = new Map<string, { identityRevision: number; task: Promise<void> }>();

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

async function loadWorkspaceFile(documentId: string): Promise<void> {
  const document = editorStore.getState().documentsById[documentId];
  if (!document || document.ref.kind !== "workspaceFile") return;

  const { workspaceId, filePath } = document.ref;
  const [text, metadata] = await Promise.all([
    workspaceFile.readText(workspaceId, filePath),
    workspaceFile.metadata(workspaceId, filePath),
  ]);

  const latest = editorStore.getState().documentsById[documentId];
  if (
    !latest ||
    latest.identityRevision !== document.identityRevision ||
    latest.draftRevision !== document.draftRevision
  )
    return;
  editorStore.getState().setDocumentPersistedSnapshot(documentId, text, {
    size: metadata.size,
    modifiedAt: metadata.modifiedAt,
  });
}

async function loadLooseFile(documentId: string): Promise<void> {
  const document = editorStore.getState().documentsById[documentId];
  if (!document || document.ref.kind !== "looseFile") return;
  if (!isDesktop()) {
    throw new Error("移动端暂不支持读取 loose file");
  }

  const text = await fs.readToString(document.ref.absolutePath);
  const latest = editorStore.getState().documentsById[documentId];
  if (
    !latest ||
    latest.identityRevision !== document.identityRevision ||
    latest.draftRevision !== document.draftRevision
  )
    return;
  editorStore.getState().setDocumentPersistedSnapshot(documentId, text);
}

async function loadDocument(documentId: string): Promise<void> {
  const document = editorStore.getState().documentsById[documentId];
  if (!document || document.loadState === "ready") return;

  if (document.ref.kind === "untitled") {
    editorStore.getState().setDocumentLoadState(documentId, "ready");
    return;
  }

  const current = () =>
    editorStore.getState().documentsById[documentId]?.identityRevision ===
    document.identityRevision;
  editorStore.getState().setDocumentLoadState(documentId, "loading");
  try {
    await claimDocumentFile(document);
    if (!current()) {
      await releaseDocumentFile(documentLeaseId(document));
      return;
    }
    if (document.ref.kind === "workspaceFile") {
      await loadWorkspaceFile(documentId);
      if (current()) editorStore.getState().setDocumentLoadState(documentId, "ready");
      return;
    }

    await loadLooseFile(documentId);
    if (current()) editorStore.getState().setDocumentLoadState(documentId, "ready");
  } catch (error) {
    await releaseDocumentFile(documentLeaseId(document));
    if (!current()) return;
    const message = getErrorMessage(error, "读取文档失败");
    editorStore.getState().setDocumentLoadState(documentId, "error", message);
    throw error;
  }
}

export const documentRegistry = {
  openEditor: (ref: EditorDocumentRef, options?: OpenEditorOptions): OpenEditorResult => {
    const result = editorStore.getState().openEditor(ref, options);
    void documentRegistry.ensureDocumentLoaded(result.documentId).catch(() => undefined);
    return result;
  },

  ensureDocumentLoaded: (documentId: string): Promise<void> => {
    if (editorWindowRuntime.isRemote()) return Promise.resolve();
    const document = editorStore.getState().documentsById[documentId];
    if (!document || document.loadState === "ready") {
      return Promise.resolve();
    }

    const existingTask = documentLoadTasks.get(documentId);
    if (existingTask?.identityRevision === document.identityRevision) return existingTask.task;

    const task = loadDocument(documentId).finally(() => {
      if (documentLoadTasks.get(documentId)?.task === task) documentLoadTasks.delete(documentId);
    });
    documentLoadTasks.set(documentId, { identityRevision: document.identityRevision, task });
    return task;
  },
};

editorStore.subscribe((state, previous) => {
  if (editorWindowRuntime.isRemote()) return;
  for (const document of Object.values(previous.documentsById)) {
    const next = state.documentsById[document.documentId];
    if (!next) {
      void releaseDocumentOwnership(document.documentId).catch((error) =>
        console.warn("释放文件占用失败", error),
      );
    } else if (next.identityRevision !== document.identityRevision) {
      // 旧物理身份保持占用，直至新身份登记成功；rename 不应制造可写空档。
      void claimDocumentFile(next)
        .then(async () => {
          const current = editorStore.getState().documentsById[next.documentId];
          if (!current || current.identityRevision !== next.identityRevision) {
            await releaseDocumentFile(documentLeaseId(next));
          }
          await releaseDocumentFile(documentLeaseId(document));
        })
        .catch((error) => {
          const current = editorStore.getState().documentsById[next.documentId];
          if (!current || current.identityRevision !== next.identityRevision) return;
          // 无法取得新身份时保留旧占用，阻止其他窗口抢占仍在编辑的物理文件。
          console.warn("更新文件占用失败", error);
          editorStore
            .getState()
            .setDocumentLoadState(
              next.documentId,
              "error",
              getErrorMessage(error, "更新文件占用失败"),
            );
        });
    }
  }
});
