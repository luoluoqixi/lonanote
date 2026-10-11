import { beforeEach, expect, mock, test } from "bun:test";

import type { EditorDocumentCapturePayload } from "../assets/editor/src/bridge/protocol";

let diskText = "原始内容";
let modifiedAt = 1;
const metadata = mock(async () => ({ size: diskText.length, modifiedAt }));
const readText = mock(async () => diskText);
const writeText = mock(async (_workspaceId: string, _path: string, text: string) => {
  diskText = text;
  modifiedAt += 1;
});

mock.module("@/api/commands/workspace", () => ({
  workspaceFile: { metadata, readText, writeText },
}));
mock.module("@/api/commands/fs", () => ({ fs: {} }));
mock.module("@/api/common/platform", () => ({
  isDesktop: () => true,
  isSystemLocaleCN: () => true,
}));
mock.module("@/stores/settings", () => ({
  settingsStore: {
    getSettings: () => ({ editorDefaults: { autoSave: true, autoSaveIntervalSeconds: 0.1 } }),
  },
}));

const { editorStore, isDocumentDirty } = await import("../src/stores/editor");
const { saveCoordinator } = await import("../src/components/editor/controllers/save_coordinator");
const { documentConflictCoordinator } =
  await import("../src/components/editor/controllers/document_conflict_coordinator");

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function openDocument() {
  const result = editorStore.getState().openEditor({
    kind: "workspaceFile",
    workspaceId: "workspace",
    filePath: "note.md",
  });
  editorStore.getState().setDocumentPersistedSnapshot(result.documentId, diskText, {
    size: diskText.length,
    modifiedAt,
  });
  editorStore.getState().setDocumentLoadState(result.documentId, "ready");
  editorStore.getState().setDocumentDraft(result.documentId, "本地编辑");
  return result;
}

function captureDraft(documentId: string): EditorDocumentCapturePayload {
  const document = editorStore.getState().documentsById[documentId];
  return { revision: document.draftRevision, text: document.draft };
}

beforeEach(() => {
  editorStore.setState({
    documentIds: [],
    documentsById: {},
    documentIdByKey: {},
    openEditorIds: [],
    editorsById: {},
    activeEditorId: null,
  });
  diskText = "原始内容";
  modifiedAt = 1;
  metadata.mockReset();
  metadata.mockImplementation(async () => ({ size: diskText.length, modifiedAt }));
  readText.mockReset();
  readText.mockImplementation(async () => diskText);
  writeText.mockReset();
  writeText.mockImplementation(async (_workspaceId, _path, text) => {
    diskText = text;
    modifiedAt += 1;
  });
});

test("自动保存与返回保存同时进入时，capture 也必须串行且只写入一次", async () => {
  const { documentId, editorId } = openDocument();
  const captureStarted = deferred<void>();
  const captureResult = deferred<EditorDocumentCapturePayload>();
  const capture = mock(async () => {
    captureStarted.resolve();
    return captureResult.promise;
  });
  const unregister = saveCoordinator.registerCaptureProvider(documentId, editorId, capture);
  try {
    const autoSave = saveCoordinator.flushDocument(documentId);
    const closeSave = saveCoordinator.flushDocument(documentId);
    await captureStarted.promise;
    expect(capture).toHaveBeenCalledTimes(1);
    captureResult.resolve(captureDraft(documentId));
    await Promise.all([autoSave, closeSave]);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(diskText).toBe("本地编辑");
    expect(isDocumentDirty(editorStore.getState().documentsById[documentId])).toBe(false);
    expect(editorStore.getState().documentsById[documentId].conflict).toBeNull();
  } finally {
    unregister();
  }
});

test("多个 flush 等待同一次写入时依次捕获最新 draft，保存期间的新编辑不会丢失", async () => {
  const { documentId } = openDocument();
  const writeStarted = deferred<void>();
  const releaseWrite = deferred<void>();
  writeText.mockImplementationOnce(async (_workspaceId, _path, text) => {
    writeStarted.resolve();
    await releaseWrite.promise;
    diskText = text;
    modifiedAt += 1;
  });
  const first = saveCoordinator.flushDocument(documentId);
  await writeStarted.promise;
  editorStore.getState().setDocumentDraft(documentId, "保存期间的新编辑");
  const second = saveCoordinator.flushDocument(documentId);
  const third = saveCoordinator.flushDocument(documentId);
  releaseWrite.resolve();
  await Promise.all([first, second, third]);
  expect(writeText.mock.calls.map((call) => call[2])).toEqual(["本地编辑", "保存期间的新编辑"]);
  expect(diskText).toBe("保存期间的新编辑");
  expect(isDocumentDirty(editorStore.getState().documentsById[documentId])).toBe(false);
  expect(editorStore.getState().documentsById[documentId].conflict).toBeNull();
});

test("一次保存失败不会阻塞已经排队的后续保存", async () => {
  const { documentId } = openDocument();
  writeText.mockRejectedValueOnce(new Error("写入失败"));
  const first = saveCoordinator.flushDocument(documentId);
  const second = saveCoordinator.flushDocument(documentId);
  const results = await Promise.allSettled([first, second]);
  expect(results[0].status).toBe("rejected");
  expect(results[1].status).toBe("fulfilled");
  expect(diskText).toBe("本地编辑");
  expect(editorStore.getState().documentsById[documentId].saveState).toBe("idle");
});

test("metadata 改变但磁盘内容仍是 savedText 时，不误报冲突且正常保存", async () => {
  const { documentId } = openDocument();
  modifiedAt += 1;
  await saveCoordinator.flushDocument(documentId);
  expect(readText).toHaveBeenCalledTimes(1);
  expect(diskText).toBe("本地编辑");
  expect(editorStore.getState().documentsById[documentId].conflict).toBeNull();
});

test("写入后 metadata 读取失败，下一次保存仍能通过 savedText 确认自身写入", async () => {
  const { documentId } = openDocument();
  metadata.mockResolvedValueOnce({ size: diskText.length, modifiedAt });
  metadata.mockRejectedValueOnce(new Error("metadata 暂时不可用"));
  await saveCoordinator.flushDocument(documentId);
  editorStore.getState().setDocumentDraft(documentId, "继续编辑");
  await saveCoordinator.flushDocument(documentId);
  expect(diskText).toBe("继续编辑");
  expect(editorStore.getState().documentsById[documentId].conflict).toBeNull();
});

test("真实外部内容变化仍阻止覆盖，继续编辑也不会恢复自动保存", async () => {
  const { documentId } = openDocument();
  diskText = "真正的外部编辑";
  modifiedAt += 1;
  await expect(saveCoordinator.flushDocument(documentId)).rejects.toThrow("外部修改冲突");
  editorStore.getState().setDocumentDraft(documentId, "冲突后的编辑");
  saveCoordinator.scheduleAutoSave(documentId);
  expect(editorStore.getState().documentsById[documentId].saveState).toBe("conflict");
  expect(writeText).not.toHaveBeenCalled();
  expect(diskText).toBe("真正的外部编辑");
  await documentConflictCoordinator.keepLocal(documentId);
  await saveCoordinator.flushDocument(documentId);
  expect(diskText).toBe("冲突后的编辑");
});

test("没有本地更改时，真实外部修改会重新加载", async () => {
  const { documentId } = openDocument();
  editorStore.getState().discardDocumentDraft(documentId);
  diskText = "真正的外部编辑";
  modifiedAt += 1;
  expect(await documentConflictCoordinator.checkForExternalChange(documentId)).toBe("reloaded");
  expect(editorStore.getState().documentsById[documentId].draft).toBe(diskText);
  expect(isDocumentDirty(editorStore.getState().documentsById[documentId])).toBe(false);
});

test("检测冲突时取消 capture 期间新建的自动保存 timer，避免重复冲突提示", async () => {
  const { documentId, editorId } = openDocument();
  diskText = "真正的外部编辑";
  modifiedAt += 1;
  const captureStarted = deferred<void>();
  const releaseCapture = deferred<void>();
  const capture = mock(async () => {
    captureStarted.resolve();
    await releaseCapture.promise;
    return captureDraft(documentId);
  });
  const unregister = saveCoordinator.registerCaptureProvider(documentId, editorId, capture);
  try {
    const save = saveCoordinator.flushDocument(documentId);
    const saveError = save.catch((error: unknown) => error);
    await captureStarted.promise;
    editorStore.getState().setDocumentDraft(documentId, "capture 期间的新编辑");
    saveCoordinator.scheduleAutoSave(documentId);
    releaseCapture.resolve();
    expect(await saveError).toMatchObject({ message: "文档存在外部修改冲突，无法保存" });
    const detectedAt = editorStore.getState().documentsById[documentId].conflict?.detectedAt;
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(capture).toHaveBeenCalledTimes(1);
    expect(editorStore.getState().documentsById[documentId].conflict?.detectedAt).toBe(detectedAt);
    expect(writeText).not.toHaveBeenCalled();
  } finally {
    saveCoordinator.cancelAutoSave(documentId);
    unregister();
  }
});

test("读取外部内容期间出现本地编辑时，保留 draft 并报告冲突", async () => {
  const { documentId } = openDocument();
  editorStore.getState().discardDocumentDraft(documentId);
  diskText = "真正的外部编辑";
  modifiedAt += 1;
  readText.mockImplementationOnce(async () => {
    editorStore.getState().setDocumentDraft(documentId, "读取期间的本地编辑");
    return diskText;
  });
  expect(await documentConflictCoordinator.checkForExternalChange(documentId)).toBe("conflict");
  expect(editorStore.getState().documentsById[documentId].draft).toBe("读取期间的本地编辑");
  expect(writeText).not.toHaveBeenCalled();
});
