import { fs } from "@/api/commands/fs";
import { claimDocumentFile } from "@/api/commands/win/file_ownership";
import { workspaceFile } from "@/api/commands/workspace";
import { isDesktop } from "@/api/common/platform";
import type { EditorDocumentCapturePayload } from "@/assets/editor/src/bridge/protocol";
import { documentConflictCoordinator } from "@/components/editor/controllers/document_conflict_coordinator";
import { editorStore, getEditorDocumentKey, isDocumentDirty } from "@/stores/editor";
import { normalizeEditorDocumentText } from "@/stores/editor/editor_document_types";
import { settingsStore } from "@/stores/settings";
import { workspaceExplorerStore } from "@/stores/workspace/workspace_explorer_runtime";

import { confirmExternalDocumentChange } from "./document_conflict_dialog";
import { documentHistoryService } from "./document_history";
import { editorInputLeaseCoordinator } from "./editor_input_lease_coordinator";
import { editorWindowRuntime } from "./editor_window_runtime";
import { chooseUntitledSaveTarget } from "./untitled_save_target";

export type DocumentSaveResult = "saved" | "cancelled";

type SaveEntry = {
  autoSaveTimer: ReturnType<typeof setTimeout> | null;
  inFlight: Promise<void> | null;
  barriers: number;
};

type CaptureProvider = () => Promise<EditorDocumentCapturePayload>;

/** composition 不允许退回 RN 已确认草稿继续保存，否则会漏掉尚未提交的输入。 */
class DocumentCompositionPendingError extends Error {}
class DocumentCaptureAuthorityError extends Error {}

const entries = new Map<string, SaveEntry>();
const captureProvidersByDocumentId = new Map<string, Map<string, CaptureProvider>>();

function getEntry(documentId: string): SaveEntry {
  let entry = entries.get(documentId);
  if (!entry) {
    entry = { autoSaveTimer: null, inFlight: null, barriers: 0 };
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

function getCaptureProvider(
  documentId: string,
): { editorId: string; capture: CaptureProvider } | null {
  const providers = captureProvidersByDocumentId.get(documentId);
  const editOwnerEditorId = editorStore.getState().documentsById[documentId]?.editOwnerEditorId;
  if (!providers || providers.size === 0) {
    if (editOwnerEditorId) throw new DocumentCaptureAuthorityError("输入持有者不可达，保存已暂停");
    return null;
  }
  if (editOwnerEditorId) {
    const ownerProvider = providers.get(editOwnerEditorId);
    if (ownerProvider) return { editorId: editOwnerEditorId, capture: ownerProvider };
    throw new DocumentCaptureAuthorityError("输入持有者不可达，保存已暂停");
  }

  const activeEditorId = editorStore.getState().activeEditorId;
  if (activeEditorId) {
    const activeProvider = providers.get(activeEditorId);
    if (activeProvider) return { editorId: activeEditorId, capture: activeProvider };
  }

  const first = providers.entries().next().value;
  return first ? { editorId: first[0], capture: first[1] } : null;
}

async function captureLatestDraft(documentId: string, strict = false): Promise<void> {
  if (!editorStore.getState().documentsById[documentId]) return;
  const captureProvider = getCaptureProvider(documentId);
  if (!captureProvider) return;

  try {
    const capture = await captureProvider.capture();
    const captureText = normalizeEditorDocumentText(capture.text);
    if (capture.composing)
      throw new DocumentCompositionPendingError("请完成当前输入法 composition 后重试");
    const document = editorStore.getState().documentsById[documentId];
    if (strict && document && capture.revision !== document.draftRevision)
      throw new Error("文档 capture 版本已变化，请重试");
    if (
      !document ||
      capture.revision !== document.draftRevision ||
      captureText === document.draft
    ) {
      return;
    }
    const view = editorStore.getState().editorsById[captureProvider.editorId];
    if (document.editOwnerEditorId === captureProvider.editorId) {
      documentHistoryService.capture(documentId, captureProvider.editorId, captureText);
    } else if (!document.editOwnerEditorId && view && view.bridgeState !== "ready") {
      // surface 首次建立输入 lease 之前的兼容初始化，仍经统一 history 接管。
      documentHistoryService.captureInitial(documentId, captureProvider.editorId, captureText);
    } else {
      throw new DocumentCaptureAuthorityError("capture持有者已改变，保存已暂停");
    }
  } catch (error) {
    if (
      strict ||
      error instanceof DocumentCompositionPendingError ||
      error instanceof DocumentCaptureAuthorityError
    )
      throw error;
    console.warn("[editor-save] document.capture failed; saving the RN draft instead", error);
  }
}

async function writeLatestSnapshot(documentId: string): Promise<DocumentSaveResult> {
  let document = editorStore.getState().documentsById[documentId];
  if (!document) return "cancelled";
  if (document.ref.kind === "untitled") {
    const identityRevision = document.identityRevision;
    const target = await chooseUntitledSaveTarget(document).catch((error) => {
      editorStore
        .getState()
        .setDocumentSaveState(
          documentId,
          "error",
          error instanceof Error ? error.message : "选择保存位置失败",
        );
      throw error;
    });
    if (!target) return "cancelled";
    let release: (() => void) | undefined;
    try {
      await captureLatestDraft(documentId, true);
      const current = editorStore.getState().documentsById[documentId];
      if (!current || current.identityRevision !== identityRevision)
        throw new Error("文档身份已变化，请重新保存");
      const key = getEditorDocumentKey(target.reference);
      const existing = editorStore.getState().documentIdByKey[key];
      if (existing && existing !== documentId) throw new Error("目标路径已有打开的文档");
      release = editorStore.getState().reserveDocumentTarget(documentId, target.reference);
      const snapshot = { revision: current.draftRevision, text: current.draft };
      editorStore.getState().setDocumentSaveState(documentId, "saving");
      await target.commit(snapshot.text);
      release?.();
      release = undefined;
      editorStore.getState().bindDocumentFile(documentId, target.reference, identityRevision);
      const metadata =
        target.reference.kind === "workspaceFile"
          ? await workspaceFile
              .metadata(target.reference.workspaceId, target.reference.filePath)
              .catch(() => null)
          : null;
      editorStore
        .getState()
        .markDocumentSaved(
          documentId,
          snapshot.revision,
          snapshot.text,
          metadata
            ? { size: metadata.size ?? null, modifiedAt: metadata.modifiedAt ?? null }
            : undefined,
        );
      saveCoordinator.scheduleAutoSave(documentId);
      if (target.reference.kind === "workspaceFile")
        await workspaceExplorerStore
          .getState()
          .invalidatePaths(target.reference.workspaceId, [target.reference.filePath])
          .catch((error) => console.warn("[editor-save] 文件已保存，刷新 Explorer 失败", error));
      return "saved";
    } catch (error) {
      editorStore
        .getState()
        .setDocumentSaveState(
          documentId,
          "error",
          error instanceof Error ? error.message : "保存文档失败",
        );
      throw error;
    } finally {
      release?.();
      await target.abort().catch((error) => console.warn("释放保存目标失败", error));
    }
  }
  if (document.loadState !== "ready") {
    throw new Error("文档尚未加载完成，无法保存");
  }
  const identityRevision = document.identityRevision;
  const externalState = await documentConflictCoordinator.checkForExternalChange(documentId);
  document = editorStore.getState().documentsById[documentId];
  if (!document || document.identityRevision !== identityRevision) return "cancelled";
  if (!isDocumentDirty(document) && externalState !== "missing") return "saved";
  if (document.conflict) {
    clearAutoSaveTimer(getEntry(documentId));
    const before = document;
    const choice = await confirmExternalDocumentChange(document.title);
    if (choice !== "overwrite" && choice !== "discard") return "cancelled";
    await captureLatestDraft(documentId, true);
    document = editorStore.getState().documentsById[documentId];
    // 弹窗等待期间的输入或身份变更不属于本次确认，不能丢弃或写入。
    if (
      !document ||
      document.identityRevision !== before.identityRevision ||
      document.draftRevision !== before.draftRevision
    )
      return "cancelled";
    if (choice === "discard") {
      await documentConflictCoordinator.loadExternal(documentId);
      const latest = editorStore.getState().documentsById[documentId];
      return latest && !isDocumentDirty(latest) ? "saved" : "cancelled";
    }
    // 覆盖只作用于本次保存；写入失败时继续保留冲突并暂停自动保存。
  }
  if (document.ref.kind === "untitled") return "cancelled";

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
    await claimDocumentFile(document);
    if (document.ref.kind === "workspaceFile") {
      await workspaceFile.writeText(document.ref.workspaceId, document.ref.filePath, snapshot.text);
      const metadata = await workspaceFile
        .metadata(document.ref.workspaceId, document.ref.filePath)
        .catch(() => null);
      editorStore.getState().markDocumentSaved(documentId, snapshot.revision, snapshot.text, {
        size: metadata?.size ?? null,
        modifiedAt: metadata?.modifiedAt ?? null,
      });
      // 文件已保存；投影刷新失败由 Explorer 展示，不能把成功写入标记为保存失败。
      await workspaceExplorerStore
        .getState()
        .invalidatePaths(document.ref.workspaceId, [document.ref.filePath])
        .catch((error) => console.warn("[editor-save] 文件已保存，刷新 Explorer 失败", error));
      return "saved";
    }

    await fs.write(document.ref.absolutePath, snapshot.text);
    editorStore.getState().markDocumentSaved(documentId, snapshot.revision, snapshot.text);
    return "saved";
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存文档失败";
    editorStore.getState().setDocumentSaveState(documentId, "error", message);
    throw error;
  }
}

async function requestSaveDocument(documentId: string): Promise<DocumentSaveResult> {
  if (editorWindowRuntime.isRemote()) {
    const { editorWindowService } = await import("./editor_window_service");
    const view = Object.values(editorStore.getState().editorsById).find(
      (v) => v.documentId === documentId,
    );
    if (!view) return "cancelled";
    return (await editorWindowService.save(view.editorId)) as DocumentSaveResult;
  }
  const entry = getEntry(documentId);
  clearAutoSaveTimer(entry);

  // 在任何 await 前登记队列，capture、冲突检测和写入必须按文档串行执行。
  const task = (entry.inFlight ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      await captureLatestDraft(documentId);
      return writeLatestSnapshot(documentId);
    });
  const barrier = task.then(
    () => undefined,
    () => undefined,
  );
  entry.inFlight = barrier;
  try {
    return await task;
  } finally {
    if (entry.inFlight === barrier) {
      entry.inFlight = null;
    }
  }
}

export interface DocumentMutationContext {
  capture(): Promise<void>;
  save(documentIds?: readonly string[]): Promise<DocumentSaveResult | void>;
}

async function withDocumentMutation<T>(
  documentIds: string[],
  operation: (context: DocumentMutationContext) => Promise<T>,
): Promise<T> {
  const ids = [...new Set(documentIds)].sort();
  const locked = ids.map((id) => ({ id, entry: getEntry(id) }));
  const previous = locked.map(({ entry }) => entry.inFlight ?? Promise.resolve());
  // 同步登记所有文档的屏障；重叠集合按登记顺序等待，不持有部分锁再申请其余锁。
  for (const { entry } of locked) {
    entry.barriers++;
    clearAutoSaveTimer(entry);
  }
  const task = Promise.all(previous.map((p) => p.catch(() => undefined))).then(async () => {
    const resume = await editorInputLeaseCoordinator.suspendDocuments(ids);
    try {
      return await operation({
        capture: async () => {
          for (const id of ids) await captureLatestDraft(id, true);
        },
        save: async (selectedIds = ids) => {
          if (selectedIds.some((id) => !ids.includes(id)))
            throw new Error("只能保存当前 mutation 屏障内的文档");
          for (const id of new Set(selectedIds)) {
            if ((await writeLatestSnapshot(id)) === "cancelled") return "cancelled";
          }
          return "saved";
        },
      });
    } finally {
      await resume();
    }
  });
  const barrier = task.then(
    () => undefined,
    () => undefined,
  );
  for (const { entry } of locked) entry.inFlight = barrier;
  try {
    return await task;
  } finally {
    for (const { id, entry } of locked) {
      entry.barriers--;
      if (entry.inFlight === barrier) entry.inFlight = null;
      if (!editorStore.getState().documentsById[id]) {
        clearAutoSaveTimer(entry);
        captureProvidersByDocumentId.delete(id);
        if (!entry.inFlight && !entry.barriers) entries.delete(id);
      } else if (!entry.barriers) {
        saveCoordinator.scheduleAutoSave(id);
      }
    }
  }
}

export const saveCoordinator = {
  withDocumentMutation,
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
    if (editorWindowRuntime.isRemote()) return;
    const document = editorStore.getState().documentsById[documentId];
    const settings = settingsStore.getSettings().editorDefaults;
    if (
      !document ||
      document.ref.kind === "untitled" ||
      !isDocumentDirty(document) ||
      document.conflict ||
      !settings.autoSave
    )
      return;

    const entry = getEntry(documentId);
    clearAutoSaveTimer(entry);
    if (entry.barriers > 0) return;
    editorStore.getState().setDocumentSaveState(documentId, "scheduled");
    const delayMs = Math.max(100, settings.autoSaveIntervalSeconds * 1000);
    entry.autoSaveTimer = setTimeout(() => {
      entry.autoSaveTimer = null;
      void requestSaveDocument(documentId).catch(() => undefined);
    }, delayMs);
  },

  requestSaveDocument,
  flushDocument: async (documentId: string): Promise<void> => {
    await requestSaveDocument(documentId);
  },

  cancelAutoSave: (documentId: string): void => {
    clearAutoSaveTimer(getEntry(documentId));
  },
};

settingsStore.subscribe((state, previousState) => {
  const autoSaveChanged =
    state.settings.editorDefaults.autoSave !== previousState.settings.editorDefaults.autoSave;
  const intervalChanged =
    state.settings.editorDefaults.autoSaveIntervalSeconds !==
    previousState.settings.editorDefaults.autoSaveIntervalSeconds;
  if (!autoSaveChanged && !intervalChanged) return;

  if (!state.settings.editorDefaults.autoSave) {
    for (const [documentId, entry] of entries) {
      clearAutoSaveTimer(entry);
      const document = editorStore.getState().documentsById[documentId];
      if (document?.saveState === "scheduled") {
        editorStore.getState().setDocumentSaveState(documentId, "idle");
      }
    }
    return;
  }

  for (const documentId of Object.keys(editorStore.getState().documentsById)) {
    saveCoordinator.scheduleAutoSave(documentId);
  }
});
