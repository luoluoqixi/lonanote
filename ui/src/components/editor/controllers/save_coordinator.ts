import { fs } from "@/api/commands/fs";
import { workspaceFile } from "@/api/commands/workspace";
import { isDesktop } from "@/api/common/platform";
import type { EditorDocumentCapturePayload } from "@/assets/editor/src/bridge/protocol";
import { documentConflictCoordinator } from "@/components/editor/controllers/document_conflict_coordinator";
import { editorStore, isDocumentDirty } from "@/stores/editor";
import { settingsStore } from "@/stores/settings";

type SaveEntry = {
  autoSaveTimer: ReturnType<typeof setTimeout> | null;
  inFlight: Promise<void> | null;
};

type CaptureProvider = () => Promise<EditorDocumentCapturePayload>;

const entries = new Map<string, SaveEntry>();
const captureProvidersByDocumentId = new Map<string, Map<string, CaptureProvider>>();

function getEntry(documentId: string): SaveEntry {
  let entry = entries.get(documentId);
  if (!entry) {
    entry = { autoSaveTimer: null, inFlight: null };
    entries.set(documentId, entry);
  }
  return entry;
}

function clearAutoSaveTimer(entry: SaveEntry): void {
  if (entry.autoSaveTimer) {
    clearTimeout(entry.autoSaveTimer);
    entry.autoSaveTimer = null;
  }
}

function getCaptureProvider(documentId: string): CaptureProvider | null {
  const providers = captureProvidersByDocumentId.get(documentId);
  if (!providers || providers.size === 0) return null;

  const editOwnerEditorId = editorStore.getState().documentsById[documentId]?.editOwnerEditorId;
  if (editOwnerEditorId) {
    const ownerProvider = providers.get(editOwnerEditorId);
    if (ownerProvider) return ownerProvider;
  }

  const activeEditorId = editorStore.getState().activeEditorId;
  if (activeEditorId) {
    const activeProvider = providers.get(activeEditorId);
    if (activeProvider) return activeProvider;
  }

  return providers.values().next().value ?? null;
}

async function captureLatestDraft(documentId: string): Promise<void> {
  const captureProvider = getCaptureProvider(documentId);
  if (!captureProvider) return;

  try {
    const capture = await captureProvider();
    const document = editorStore.getState().documentsById[documentId];
    if (
      !document ||
      capture.revision !== document.draftRevision ||
      capture.text === document.draft
    ) {
      return;
    }
    editorStore.getState().setDocumentDraft(documentId, capture.text);
  } catch (error) {
    console.warn("[editor-save] document.capture failed; saving the RN draft instead", error);
  }
}

async function writeLatestSnapshot(documentId: string): Promise<void> {
  let document = editorStore.getState().documentsById[documentId];
  if (!document || !isDocumentDirty(document)) return;

  if (document.loadState !== "ready") {
    throw new Error("文档尚未加载完成，无法保存");
  }
  await documentConflictCoordinator.checkForExternalChange(documentId);
  document = editorStore.getState().documentsById[documentId];
  if (!document || !isDocumentDirty(document)) return;
  if (document.saveState === "conflict") {
    throw new Error("文档存在外部修改冲突，无法保存");
  }
  if (document.ref.kind === "untitled") {
    const message = "未命名文档需要先选择保存位置";
    editorStore.getState().setDocumentSaveState(documentId, "error", message);
    throw new Error(message);
  }

  if (document.ref.kind === "looseFile" && !isDesktop()) {
    const message = "移动端暂不支持保存 loose file";
    editorStore.getState().setDocumentSaveState(documentId, "error", message);
    throw new Error(message);
  }

  const snapshot = {
    revision: document.draftRevision,
    text: document.draft,
  };
  editorStore.getState().setDocumentSaveState(documentId, "saving");

  try {
    if (document.ref.kind === "workspaceFile") {
      await workspaceFile.writeText(document.ref.workspaceId, document.ref.filePath, snapshot.text);
      const metadata = await workspaceFile
        .metadata(document.ref.workspaceId, document.ref.filePath)
        .catch(() => null);
      editorStore.getState().markDocumentSaved(documentId, snapshot.revision, snapshot.text, {
        size: metadata?.size ?? null,
        modifiedAt: metadata?.modifiedAt ?? null,
      });
      return;
    }

    await fs.write(document.ref.absolutePath, snapshot.text);
    editorStore.getState().markDocumentSaved(documentId, snapshot.revision, snapshot.text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存文档失败";
    editorStore.getState().setDocumentSaveState(documentId, "error", message);
    throw error;
  }
}

async function flushDocument(documentId: string): Promise<void> {
  const entry = getEntry(documentId);
  clearAutoSaveTimer(entry);

  if (entry.inFlight) {
    await entry.inFlight.catch(() => undefined);
  }

  await captureLatestDraft(documentId);

  const document = editorStore.getState().documentsById[documentId];
  if (!document || !isDocumentDirty(document)) {
    return;
  }

  const task = writeLatestSnapshot(documentId);
  entry.inFlight = task;
  try {
    await task;
  } finally {
    if (entry.inFlight === task) {
      entry.inFlight = null;
    }
  }
}

export const saveCoordinator = {
  registerCaptureProvider: (
    documentId: string,
    editorId: string,
    capture: CaptureProvider,
  ): (() => void) => {
    let providers = captureProvidersByDocumentId.get(documentId);
    if (!providers) {
      providers = new Map();
      captureProvidersByDocumentId.set(documentId, providers);
    }
    providers.set(editorId, capture);

    return () => {
      const currentProviders = captureProvidersByDocumentId.get(documentId);
      if (!currentProviders || currentProviders.get(editorId) !== capture) return;
      currentProviders.delete(editorId);
      if (currentProviders.size === 0) {
        captureProvidersByDocumentId.delete(documentId);
      }
    };
  },

  scheduleAutoSave: (documentId: string): void => {
    const document = editorStore.getState().documentsById[documentId];
    const settings = settingsStore.getSettings().editorDefaults;
    if (!document || !isDocumentDirty(document) || !settings.autoSave) return;

    const entry = getEntry(documentId);
    clearAutoSaveTimer(entry);
    editorStore.getState().setDocumentSaveState(documentId, "scheduled");
    const delayMs = Math.max(100, settings.autoSaveIntervalSeconds * 1000);
    entry.autoSaveTimer = setTimeout(() => {
      entry.autoSaveTimer = null;
      void flushDocument(documentId).catch(() => undefined);
    }, delayMs);
  },

  flushDocument,

  cancelAutoSave: (documentId: string): void => {
    clearAutoSaveTimer(getEntry(documentId));
  },
};
