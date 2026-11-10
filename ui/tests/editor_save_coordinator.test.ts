import { beforeEach, expect, mock, spyOn, test } from "bun:test";

import type { EditorDocumentCapturePayload } from "../assets/editor/src/bridge/protocol";

let diskText = "原始内容";
let modifiedAt = 1;
let fileExists = true;
const confirmConflict = mock(async (): Promise<string | null> => "cancel");
mock.module("@/components/editor/controllers/document_conflict_dialog", () => ({
  confirmExternalDocumentChange: confirmConflict,
}));
const metadata = mock(async () => ({ size: diskText.length, modifiedAt }));
const readText = mock(async () => diskText);
const writeText = mock(async (_workspaceId: string, _path: string, text: string) => {
  diskText = text;
  modifiedAt += 1;
});

mock.module("@/api/commands/workspace", () => ({
  workspaceFile: { metadata, readText, writeText, exists: async () => fileExists },
}));
mock.module("@/api/commands/fs", () => ({
  fs: {
    exists: async () => fileExists,
    readToString: async () => {
      if (!fileExists) throw new Error("不存在");
      return diskText;
    },
    write: async (_path: string, text: string) => {
      diskText = text;
      fileExists = true;
    },
  },
}));
mock.module("@/api/common/platform", () => ({
  isDesktop: () => true,
  isTauri: () => false,
  isSystemLocaleCN: () => true,
}));
mock.module("@/stores/settings", () => ({
  settingsStore: {
    subscribe: () => () => {},
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
const { documentHistoryService } =
  await import("../src/components/editor/controllers/document_history");

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

test("外部修改选择覆盖时写入本地草稿并清除冲突", async () => {
  const { documentId } = openDocument();
  diskText = "外部修改";
  modifiedAt++;
  confirmConflict.mockResolvedValueOnce("overwrite");
  expect(await saveCoordinator.requestSaveDocument(documentId)).toBe("saved");
  expect(diskText).toBe("本地编辑");
  expect(isDocumentDirty(editorStore.getState().documentsById[documentId])).toBe(false);
  expect(editorStore.getState().documentsById[documentId].conflict).toBeNull();
});

test("外部修改选择丢弃时加载磁盘版本而不写入", async () => {
  const { documentId } = openDocument();
  diskText = "外部修改";
  modifiedAt++;
  confirmConflict.mockResolvedValueOnce("discard");
  expect(await saveCoordinator.requestSaveDocument(documentId)).toBe("saved");
  expect(diskText).toBe("外部修改");
  expect(editorStore.getState().documentsById[documentId].draft).toBe("外部修改");
  expect(isDocumentDirty(editorStore.getState().documentsById[documentId])).toBe(false);
});

test("冲突确认期间新增编辑时不丢弃草稿", async () => {
  const { documentId } = openDocument();
  diskText = "外部修改";
  modifiedAt++;
  confirmConflict.mockImplementationOnce(async () => {
    editorStore.getState().setDocumentDraft(documentId, "确认期间输入");
    return "discard";
  });
  expect(await saveCoordinator.requestSaveDocument(documentId)).toBe("cancelled");
  expect(editorStore.getState().documentsById[documentId].draft).toBe("确认期间输入");
  expect(diskText).toBe("外部修改");
});

test("关闭时保存遇到冲突选择取消，保留标签与本地草稿", async () => {
  const { documentId, editorId } = openDocument();
  diskText = "外部修改";
  modifiedAt++;
  const { createEditorCloseActions } =
    await import("../src/components/editor/controllers/editor_close_actions");
  const actions = createEditorCloseActions({ saveCoordinator, confirmDirty: async () => "save" });
  expect(await actions.close({ editorIds: [editorId] })).toBe(false);
  expect(editorStore.getState().editorsById[editorId]).toBeDefined();
  expect(editorStore.getState().documentsById[documentId].draft).toBe("本地编辑");
  expect(diskText).toBe("外部修改");
});

test("外部检查期间文档改名时不写入新身份", async () => {
  const { documentId } = openDocument();
  modifiedAt++;
  readText.mockImplementationOnce(async () => {
    editorStore.getState().renameWorkspacePath("workspace", "note.md", "renamed.md");
    return "原始内容";
  });
  expect(await saveCoordinator.requestSaveDocument(documentId)).toBe("cancelled");
  expect(diskText).toBe("原始内容");
});

test("外部删除后保存重新创建文件，真实写入失败仍保留草稿", async () => {
  const { documentId } = openDocument();
  fileExists = false;
  metadata.mockRejectedValue(new Error("不存在"));
  expect(await saveCoordinator.requestSaveDocument(documentId)).toBe("saved");
  expect(diskText).toBe("本地编辑");
  editorStore.getState().setDocumentDraft(documentId, "再次输入");
  writeText.mockRejectedValueOnce(new Error("拒绝写入"));
  await expect(saveCoordinator.requestSaveDocument(documentId)).rejects.toThrow("拒绝写入");
  expect(editorStore.getState().documentsById[documentId].draft).toBe("再次输入");
  expect(isDocumentDirty(editorStore.getState().documentsById[documentId])).toBe(true);
});

test("文件仍存在时元数据错误不能视为外部删除", async () => {
  const { documentId } = openDocument();
  metadata.mockRejectedValueOnce(new Error("读取被拒绝"));
  await expect(saveCoordinator.requestSaveDocument(documentId)).rejects.toThrow("读取被拒绝");
  expect(diskText).toBe("原始内容");
});

test("没有新增编辑时主动保存也会重建被外部删除的文件", async () => {
  const { documentId } = openDocument();
  editorStore.getState().discardDocumentDraft(documentId);
  fileExists = false;
  diskText = "";
  metadata.mockRejectedValue(new Error("不存在"));
  readText.mockRejectedValue(new Error("不存在"));
  expect(await saveCoordinator.requestSaveDocument(documentId)).toBe("saved");
  expect(diskText).toBe("原始内容");
});

test("外部文件也检测冲突，丢弃后再次编辑可重新创建已删除文件", async () => {
  const { documentId } = editorStore.getState().openEditor({
    kind: "looseFile",
    absolutePath: "C:/notes/note.md",
  });
  editorStore.getState().setDocumentPersistedSnapshot(documentId, diskText);
  editorStore.getState().setDocumentLoadState(documentId, "ready");
  editorStore.getState().setDocumentDraft(documentId, "本地修改");
  diskText = "外部修改";
  confirmConflict.mockResolvedValueOnce("discard");
  expect(await saveCoordinator.requestSaveDocument(documentId)).toBe("saved");
  expect(diskText).toBe("外部修改");
  expect(editorStore.getState().documentsById[documentId].draft).toBe("外部修改");
  editorStore.getState().setDocumentDraft(documentId, "删除后编辑");
  fileExists = false;
  expect(await saveCoordinator.requestSaveDocument(documentId)).toBe("saved");
  expect(fileExists).toBe(true);
  expect(diskText).toBe("删除后编辑");
});

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
  fileExists = true;
  confirmConflict.mockReset();
  confirmConflict.mockImplementation(async () => "cancel");
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

test("composition capture 阻止保存与关闭mutation，远端草稿保持不变", async () => {
  const { documentId, editorId } = openDocument();
  const remote = editorStore.getState().attachRemoteEditor(editorId, "aux");
  editorStore.getState().closeEditor(editorId);
  const unregister = saveCoordinator.registerCaptureProvider(documentId, remote, async () => ({
    ...captureDraft(documentId),
    text: "拼音尚未提交",
    composing: true,
  }));
  try {
    await expect(saveCoordinator.flushDocument(documentId)).rejects.toThrow("composition");
    const operation = mock(async () => {});
    await expect(
      saveCoordinator.withDocumentMutation([documentId], async (context) => {
        await context.capture();
        await operation();
      }),
    ).rejects.toThrow("composition");
    expect(operation).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(editorStore.getState().documentsById[documentId].draft).toBe("本地编辑");
  } finally {
    unregister();
  }
});

test("保存capture进入共享history，先前输入仍可连续撤销", async () => {
  const { documentId, editorId } = openDocument();
  editorStore.getState().setDocumentEditOwner(documentId, editorId);
  documentHistoryService.capture(documentId, editorId, "第一笔");
  const unregister = saveCoordinator.registerCaptureProvider(documentId, editorId, async () => ({
    ...captureDraft(documentId),
    text: "最后输入",
  }));
  try {
    await saveCoordinator.flushDocument(documentId);
    expect(diskText).toBe("最后输入");
    documentHistoryService.history(documentId, "undo", editorId);
    expect(editorStore.getState().documentsById[documentId].draft).toBe("第一笔");
    documentHistoryService.history(documentId, "undo", editorId);
    expect(editorStore.getState().documentsById[documentId].draft).toBe("本地编辑");
  } finally {
    unregister();
  }
});

test("磁盘CRLF与canonical LF内容等价，不误报外部冲突并保留原metadata", async () => {
  const { documentId } = openDocument();
  diskText = "甲\r\n乙\r\n";
  modifiedAt = 10;
  editorStore
    .getState()
    .setDocumentPersistedSnapshot(documentId, "甲\n乙\n", { size: diskText.length, modifiedAt });
  editorStore.getState().setDocumentDraft(documentId, "甲\n乙\n丁\n");
  modifiedAt = 11;
  expect(await documentConflictCoordinator.checkForExternalChange(documentId)).toBe("unchanged");
  expect(editorStore.getState().documentsById[documentId].savedFingerprint).toEqual({
    size: diskText.length,
    modifiedAt: 11,
  });
  await saveCoordinator.flushDocument(documentId);
  expect(diskText).toBe("甲\n乙\n丁\n");
  expect(editorStore.getState().documentsById[documentId].conflict).toBeNull();
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

test("外部修改选择取消时保留双方内容，继续编辑也不会恢复自动保存", async () => {
  const { documentId } = openDocument();
  diskText = "真正的外部编辑";
  modifiedAt += 1;
  expect(await saveCoordinator.requestSaveDocument(documentId)).toBe("cancelled");
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
    expect(await saveError).toBeUndefined();
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

test("加载失败保留 Native 字符串原因，并记录文件引用、失败阶段和原始错误", async () => {
  const { documentRegistry } =
    await import("../src/components/editor/controllers/document_registry");
  const opened = editorStore.getState().openEditor({
    kind: "workspaceFile",
    workspaceId: "workspace",
    filePath: "unreadable.md",
  });
  const error = "存储路径不存在: unreadable.md";
  readText.mockRejectedValueOnce(error);
  const log = spyOn(console, "error").mockImplementation(() => {});
  try {
    await expect(documentRegistry.ensureDocumentLoaded(opened.documentId)).rejects.toBe(error);
    const document = editorStore.getState().documentsById[opened.documentId];
    expect(document.loadState).toBe("error");
    expect(document.loadError).toBe(error);
    expect(log.mock.calls).toHaveLength(1);
    expect(log.mock.calls[0][1]).toMatchObject({
      documentId: opened.documentId,
      reference: { kind: "workspaceFile", workspaceId: "workspace", filePath: "unreadable.md" },
      stage: "read-workspace-file",
    });
    expect(log.mock.calls[0][2]).toBe(error);
  } finally {
    log.mockRestore();
  }
});

test("占用登记失败即使释放也失败，仍展示并抛出最初的错误", async () => {
  const { documentRegistry } =
    await import("../src/components/editor/controllers/document_registry");
  const ownership = await import("../src/api/commands/win/file_ownership");
  const opened = editorStore
    .getState()
    .openEditor({ kind: "looseFile", absolutePath: "C:/notes/failed.md" });
  const error = { message: "文件占用登记失败", code: "claim_failed" };
  const claim = spyOn(ownership, "claimDocumentFile").mockRejectedValueOnce(error);
  const release = spyOn(ownership, "releaseDocumentFile").mockRejectedValueOnce("释放失败");
  const log = spyOn(console, "error").mockImplementation(() => {});
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  try {
    await expect(documentRegistry.ensureDocumentLoaded(opened.documentId)).rejects.toBe(error);
    const document = editorStore.getState().documentsById[opened.documentId];
    expect(document.loadState).toBe("error");
    expect(document.loadError).toBe("文件占用登记失败");
    expect(log.mock.calls[0][1]).toMatchObject({
      stage: "claim-file",
      reference: { absolutePath: "C:/notes/failed.md" },
    });
    expect(log.mock.calls[0][2]).toBe(error);
  } finally {
    claim.mockRestore();
    release.mockRestore();
    log.mockRestore();
    warn.mockRestore();
  }
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
  editorStore.getState().setDocumentPersistedSnapshot(second.documentId, diskText, {
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
