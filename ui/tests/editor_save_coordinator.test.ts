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

const invalidatePaths = mock(async (_id: string, _paths: string[]) => {});
mock.module("@/stores/workspace/workspace_explorer_runtime", () => ({
  workspaceExplorerStore: { getState: () => ({ invalidatePaths }) },
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
  invalidatePaths.mockReset();
  invalidatePaths.mockImplementation(async () => {});
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

test("mutation 等待已经开始的保存，内部 save 不等待自身，之后 flush 只写新路径", async () => {
  const { documentId } = openDocument();
  const started = deferred<void>();
  const release = deferred<void>();
  writeText.mockImplementationOnce(async (_w, _p, text) => {
    started.resolve();
    await release.promise;
    diskText = text;
    modifiedAt++;
  });
  const saving = saveCoordinator.flushDocument(documentId);
  await started.promise;
  let renamed = false;
  const mutation = saveCoordinator.withDocumentMutation([documentId], async (context) => {
    await context.capture();
    await context.save();
    editorStore.getState().renameWorkspacePath("workspace", "note.md", "new.md");
    renamed = true;
  });
  const queued = saveCoordinator.flushDocument(documentId);
  await Promise.resolve();
  expect(renamed).toBe(false);
  release.resolve();
  await Promise.all([saving, mutation, queued]);
  editorStore.getState().setDocumentDraft(documentId, "改名后编辑");
  await saveCoordinator.flushDocument(documentId);
  expect(editorStore.getState().documentsById[documentId].ref).toEqual({
    kind: "workspaceFile",
    workspaceId: "workspace",
    filePath: "new.md",
  });
  expect(writeText.mock.calls.at(-1)?.[1]).toBe("new.md");
});

test("delete 屏障之后排队的 flush 不重建删除路径", async () => {
  const { documentId } = openDocument();
  const mutation = saveCoordinator.withDocumentMutation([documentId], async () => {
    editorStore.getState().removeWorkspacePaths("workspace", ["note.md"]);
  });
  const flush = saveCoordinator.flushDocument(documentId);
  await Promise.all([mutation, flush]);
  expect(writeText).not.toHaveBeenCalled();
  expect(editorStore.getState().documentsById[documentId]).toBeUndefined();
});

test("mutation 严格 capture 失败时不执行文件操作", async () => {
  const { documentId, editorId } = openDocument();
  let mutated = false;
  const unregister = saveCoordinator.registerCaptureProvider(documentId, editorId, async () => {
    throw new Error("capture failed");
  });
  try {
    await expect(
      saveCoordinator.withDocumentMutation([documentId], async (context) => {
        await context.capture();
        mutated = true;
      }),
    ).rejects.toThrow("capture failed");
    expect(mutated).toBe(false);
  } finally {
    unregister();
  }
});

test("改名后冲突读取晚返回不覆盖新身份与 draft", async () => {
  const { documentId } = openDocument();
  editorStore.getState().discardDocumentDraft(documentId);
  modifiedAt++;
  const started = deferred<void>();
  const external = deferred<string>();
  readText.mockImplementationOnce(async () => {
    started.resolve();
    return external.promise;
  });
  const check = documentConflictCoordinator.checkForExternalChange(documentId);
  await started.promise;
  editorStore.getState().renameWorkspacePath("workspace", "note.md", "new.md");
  editorStore.getState().setDocumentDraft(documentId, "改名后的 draft");
  external.resolve("旧路径外部内容");
  await check;
  expect(editorStore.getState().documentsById[documentId].draft).toBe("改名后的 draft");
  expect(editorStore.getState().documentsById[documentId].conflict).toBeNull();
});

test("文档加载晚返回不发布旧身份；删除 dirty 无 view 文档及多个 views", async () => {
  const { documentRegistry } =
    await import("../src/components/editor/controllers/document_registry");
  const old = deferred<string>();
  readText.mockImplementationOnce(() => old.promise);
  const opened = editorStore
    .getState()
    .openEditor({ kind: "workspaceFile", workspaceId: "workspace", filePath: "old/a.md" });
  const load = documentRegistry.ensureDocumentLoaded(opened.documentId);
  editorStore.getState().renameWorkspacePath("workspace", "old", "new");
  editorStore.getState().setDocumentDraft(opened.documentId, "新身份 draft");
  old.resolve("旧读取");
  await load;
  expect(editorStore.getState().documentsById[opened.documentId].draft).toBe("新身份 draft");
  const duplicate = editorStore
    .getState()
    .openEditor(
      { kind: "workspaceFile", workspaceId: "workspace", filePath: "new/a.md" },
      { duplicate: true },
    );
  expect(duplicate.documentId).toBe(opened.documentId);
  editorStore.getState().removeWorkspacePaths("workspace", ["new"]);
  expect(editorStore.getState().openEditorIds).toEqual([]);
  expect(editorStore.getState().documentIds).toEqual([]);
  const dirty = openDocument();
  editorStore.getState().closeEditor(dirty.editorId);
  expect(editorStore.getState().documentsById[dirty.documentId]).toBeDefined();
  editorStore.getState().removeWorkspacePaths("workspace", ["note.md"]);
  expect(editorStore.getState().documentsById[dirty.documentId]).toBeUndefined();
});

test("保存 .gitignore 后刷新共享 Explorer，刷新失败不回退文件保存成功", async () => {
  const { documentId } = openDocument();
  editorStore.getState().renameWorkspacePath("workspace", "note.md", ".gitignore");
  invalidatePaths.mockRejectedValueOnce(new Error("刷新失败"));
  await saveCoordinator.flushDocument(documentId);
  expect(invalidatePaths).toHaveBeenCalledWith("workspace", [".gitignore"]);
  expect(diskText).toBe("本地编辑");
  expect(isDocumentDirty(editorStore.getState().documentsById[documentId])).toBe(false);
  expect(editorStore.getState().documentsById[documentId].saveState).toBe("idle");
});

test("mutation 只保存指定的关闭文档，保留共享视图的未保存草稿", async () => {
  const first = openDocument();
  const second = editorStore
    .getState()
    .openEditor({ kind: "workspaceFile", workspaceId: "workspace", filePath: "second.md" });
  editorStore
    .getState()
    .setDocumentPersistedSnapshot(second.documentId, diskText, {
      size: diskText.length,
      modifiedAt,
    });
  editorStore.getState().setDocumentLoadState(second.documentId, "ready");
  editorStore.getState().setDocumentDraft(second.documentId, "共享视图草稿");
  try {
    await saveCoordinator.withDocumentMutation(
      [first.documentId, second.documentId],
      async (context) => {
        await context.save([first.documentId]);
      },
    );
    expect(writeText.mock.calls.map((call) => call[1])).toEqual(["note.md"]);
    expect(isDocumentDirty(editorStore.getState().documentsById[second.documentId])).toBe(true);
  } finally {
    saveCoordinator.cancelAutoSave(first.documentId);
    saveCoordinator.cancelAutoSave(second.documentId);
  }
});
