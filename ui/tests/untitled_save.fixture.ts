import { expect, mock, test } from "bun:test";

const commit = mock(async (_text: string) => {});
const abort = mock(async () => {});
let cancelled = false;
let failWrite = false;
commit.mockImplementation(async () => {
  if (failWrite) throw new Error("写入失败");
});
mock.module("@/components/editor/controllers/untitled_save_target", () => ({
  chooseUntitledSaveTarget: async (document: { documentId: string }) =>
    cancelled
      ? null
      : {
          reference: { kind: "looseFile", absolutePath: `C:/temp/${document.documentId}.md` },
          commit,
          abort,
        },
}));
mock.module("@/api/commands/win/file_ownership", () => ({ claimDocumentFile: async () => {} }));
mock.module("@/api/commands/fs", () => ({ fs: { write: async () => {} } }));
mock.module("@/api/commands/workspace", () => ({ workspaceFile: {} }));
mock.module("@/stores/workspace/workspace_explorer_runtime", () => ({
  workspaceExplorerStore: { getState: () => ({ invalidatePaths: async () => {} }) },
}));
mock.module("@/api/common/platform", () => ({ isDesktop: () => true }));
mock.module("@/stores/settings", () => ({
  settingsStore: {
    subscribe: () => () => {},
    getSettings: () => ({ editorDefaults: { autoSave: true, autoSaveIntervalSeconds: 0.1 } }),
  },
}));
mock.module("@/components/editor/controllers/document_conflict_coordinator", () => ({
  documentConflictCoordinator: { checkForExternalChange: async () => {} },
}));
const { editorStore, isDocumentDirty } = await import("../src/stores/editor");
const { saveCoordinator } = await import("../src/components/editor/controllers/save_coordinator");
const { createEditorCloseActions } =
  await import("../src/components/editor/controllers/editor_close_actions");

test("clean 无标题主动保存并原地绑定，自动保存不触发目标选择", async () => {
  const { documentId, editorId } = editorStore.getState().openEditor({ kind: "untitled" });
  saveCoordinator.scheduleAutoSave(documentId);
  expect(editorStore.getState().documentsById[documentId].saveState).toBe("idle");
  expect(await saveCoordinator.requestSaveDocument(documentId)).toBe("saved");
  expect(commit).toHaveBeenCalledWith("");
  expect(editorStore.getState().editorsById[editorId].documentId).toBe(documentId);
  expect(editorStore.getState().documentsById[documentId].ref.kind).toBe("looseFile");
});
test("关闭屏障内首次保存取消保留标签和草稿，不死锁", async () => {
  cancelled = true;
  const { documentId, editorId } = editorStore.getState().openEditor({ kind: "untitled" });
  editorStore.getState().setDocumentDraft(documentId, "草稿");
  const actions = createEditorCloseActions({ saveCoordinator, confirmDirty: async () => "save" });
  expect(await actions.close({ editorIds: [editorId] })).toBe(false);
  expect(isDocumentDirty(editorStore.getState().documentsById[documentId])).toBe(true);
  expect(editorStore.getState().openEditorIds).toContain(editorId);
});

test("dirty 无标题自动保存不产生写入；关闭保存成功才关闭标签", async () => {
  cancelled = false;
  const { documentId, editorId } = editorStore.getState().openEditor({ kind: "untitled" });
  editorStore.getState().setDocumentDraft(documentId, "内容");
  const count = commit.mock.calls.length;
  saveCoordinator.scheduleAutoSave(documentId);
  await new Promise((resolve) => setTimeout(resolve, 130));
  expect(commit.mock.calls.length).toBe(count);
  expect(editorStore.getState().documentsById[documentId].saveState).toBe("idle");
  const actions = createEditorCloseActions({ saveCoordinator, confirmDirty: async () => "save" });
  expect(await actions.close({ editorIds: [editorId] })).toBe(true);
  expect(editorStore.getState().openEditorIds).not.toContain(editorId);
});

test("首次写入失败不绑定身份、不丢失草稿并释放目标", async () => {
  failWrite = true;
  const { documentId } = editorStore.getState().openEditor({ kind: "untitled" });
  editorStore.getState().setDocumentDraft(documentId, "保留草稿");
  await expect(saveCoordinator.requestSaveDocument(documentId)).rejects.toThrow("写入失败");
  expect(editorStore.getState().documentsById[documentId].ref.kind).toBe("untitled");
  expect(editorStore.getState().documentsById[documentId].draft).toBe("保留草稿");
  expect(isDocumentDirty(editorStore.getState().documentsById[documentId])).toBe(true);
  failWrite = false;
});

test("首次保存期间新增草稿会在绑定后继续自动保存", async () => {
  const { documentId } = editorStore.getState().openEditor({ kind: "untitled" });
  editorStore.getState().setDocumentDraft(documentId, "first");
  commit.mockImplementationOnce(async () => {
    editorStore.getState().setDocumentDraft(documentId, "newer");
    saveCoordinator.scheduleAutoSave(documentId);
  });
  await saveCoordinator.requestSaveDocument(documentId);
  expect(editorStore.getState().documentsById[documentId].saveState).toBe("scheduled");
  saveCoordinator.cancelAutoSave(documentId);
});
