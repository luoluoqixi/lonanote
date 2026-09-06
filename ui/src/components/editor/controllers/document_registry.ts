import { fs } from "@/api/commands/fs";
import { workspaceFile } from "@/api/commands/workspace";
import { isDesktop } from "@/api/common/platform";
import {
  type EditorDocumentRef,
  type OpenEditorOptions,
  type OpenEditorResult,
  editorStore,
} from "@/stores/editor";

const documentLoadTasks = new Map<string, Promise<void>>();

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
  editorStore.getState().setDocumentPersistedSnapshot(documentId, text);
}

async function loadDocument(documentId: string): Promise<void> {
  const document = editorStore.getState().documentsById[documentId];
  if (!document || document.loadState === "ready") return;

  if (document.ref.kind === "untitled") {
    editorStore.getState().setDocumentLoadState(documentId, "ready");
    return;
  }

  editorStore.getState().setDocumentLoadState(documentId, "loading");
  try {
    if (document.ref.kind === "workspaceFile") {
      await loadWorkspaceFile(documentId);
      editorStore.getState().setDocumentLoadState(documentId, "ready");
      return;
    }

    await loadLooseFile(documentId);
    editorStore.getState().setDocumentLoadState(documentId, "ready");
  } catch (error) {
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
    const document = editorStore.getState().documentsById[documentId];
    if (!document || document.loadState === "ready") {
      return Promise.resolve();
    }

    const existingTask = documentLoadTasks.get(documentId);
    if (existingTask) return existingTask;

    const task = loadDocument(documentId).finally(() => {
      documentLoadTasks.delete(documentId);
    });
    documentLoadTasks.set(documentId, task);
    return task;
  },
};
