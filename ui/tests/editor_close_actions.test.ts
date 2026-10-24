import { beforeEach, expect, mock, test } from "bun:test";

import {
  createEditorCloseActions,
  getWorkspaceCloseTargets,
} from "../src/components/editor/controllers/editor_close_actions";
import { editorStore, isDocumentDirty } from "../src/stores/editor";

beforeEach(() =>
  editorStore.setState({
    documentIds: [],
    documentsById: {},
    documentIdByKey: {},
    openEditorIds: [],
    editorsById: {},
    viewersById: {},
    activeEditorId: null,
  }),
);
function open(workspaceId = "old", dirty = true) {
  const value = editorStore
    .getState()
    .openEditor({ kind: "workspaceFile", workspaceId, filePath: "note.md" });
  if (dirty) editorStore.getState().setDocumentDraft(value.documentId, "修改");
  return value;
}
function setup(choice: "save" | "discard" | "cancel" = "cancel") {
  const confirmDirty = mock(async () => choice);
  const save = mock(async () => {
    for (const d of Object.values(editorStore.getState().documentsById))
      editorStore.getState().markDocumentSaved(d.documentId, d.draftRevision, d.draft);
  });
  const capture = mock(async () => {});
  const actions = createEditorCloseActions({
    confirmDirty,
    saveCoordinator: {
      withDocumentMutation: async (_ids, operation) => operation({ capture, save }),
    },
  });
  return { actions, confirmDirty, save, capture };
}
test("取消工作区关闭不关闭 Core、不丢弃草稿和标签", async () => {
  const { editorId, documentId } = open();
  const closeCore = mock(async () => {});
  const { actions } = setup();
  expect(await actions.close(getWorkspaceCloseTargets("old"), closeCore)).toBe(false);
  expect(closeCore).not.toHaveBeenCalled();
  expect(editorStore.getState().openEditorIds).toEqual([editorId]);
  expect(isDocumentDirty(editorStore.getState().documentsById[documentId])).toBe(true);
});
test("保存后关闭旧工作区文本、媒体，保留其他工作区与 loose file", async () => {
  const old = open();
  const other = open("other");
  editorStore
    .getState()
    .openViewer({ kind: "workspaceFile", workspaceId: "old", filePath: "image.png" }, "image");
  const loose = editorStore.getState().openEditor({ kind: "looseFile", absolutePath: "/tmp/a.md" });
  const { actions, save } = setup("save");
  await actions.close(getWorkspaceCloseTargets("old"), async () => {
    expect(isDocumentDirty(editorStore.getState().documentsById[old.documentId])).toBe(false);
  });
  expect(save).toHaveBeenCalledTimes(1);
  expect(editorStore.getState().openEditorIds).toEqual([other.editorId, loose.editorId]);
  expect(editorStore.getState().documentsById[old.documentId]).toBeUndefined();
});
test("放弃但 Core 关闭失败时仍保留原始草稿", async () => {
  const d = open();
  const { actions } = setup("discard");
  await expect(
    actions.close(getWorkspaceCloseTargets("old"), async () => {
      throw new Error("关闭失败");
    }),
  ).rejects.toThrow("关闭失败");
  expect(editorStore.getState().documentsById[d.documentId].draft).toBe("修改");
  expect(editorStore.getState().openEditorIds).toEqual([d.editorId]);
});
test("保存失败不关闭任何标签", async () => {
  const d = open();
  const { actions, save } = setup("save");
  save.mockRejectedValueOnce(new Error("保存失败"));
  const closeCore = mock(async () => {});
  await expect(actions.close(getWorkspaceCloseTargets("old"), closeCore)).rejects.toThrow(
    "保存失败",
  );
  expect(closeCore).not.toHaveBeenCalled();
  expect(editorStore.getState().openEditorIds).toEqual([d.editorId]);
});
test("关闭重复视图之一不询问也不丢弃共享草稿", async () => {
  const d = open();
  const duplicate = editorStore
    .getState()
    .openEditor(
      { kind: "workspaceFile", workspaceId: "old", filePath: "note.md" },
      { duplicate: true },
    );
  const { actions, confirmDirty } = setup("discard");
  await actions.close({ editorIds: [d.editorId] });
  expect(confirmDirty).not.toHaveBeenCalled();
  expect(editorStore.getState().documentsById[d.documentId].draft).toBe("修改");
  expect(editorStore.getState().openEditorIds).toEqual([duplicate.editorId]);
});
test("capture 捕获最后一次编辑后才决定提示", async () => {
  const d = open("old", false);
  const { actions, capture, confirmDirty } = setup("cancel");
  capture.mockImplementationOnce(async () => {
    editorStore.getState().setDocumentDraft(d.documentId, "最后一次输入");
  });
  expect(await actions.close(getWorkspaceCloseTargets("old"))).toBe(false);
  expect(confirmDirty).toHaveBeenCalledTimes(1);
});
test("工作区关闭也检查无标签的遗留草稿", async () => {
  const d = open();
  editorStore.getState().closeEditor(d.editorId);
  const { actions, confirmDirty } = setup("discard");
  await actions.close(getWorkspaceCloseTargets("old"));
  expect(confirmDirty).toHaveBeenCalledTimes(1);
  expect(editorStore.getState().documentsById[d.documentId]).toBeUndefined();
});
test("目标打开取消或失败时不丢弃旧工作区草稿", async () => {
  const d = open();
  const { actions } = setup("discard");
  expect(await actions.close(getWorkspaceCloseTargets("old"), async () => false)).toBe(false);
  expect(editorStore.getState().documentsById[d.documentId].draft).toBe("修改");
  expect(editorStore.getState().openEditorIds).toEqual([d.editorId]);
});
test("关闭已保存跳过 capture 后发现的未保存输入", async () => {
  const d = open("old", false);
  const { actions, capture, confirmDirty } = setup();
  capture.mockImplementationOnce(async () => {
    editorStore.getState().setDocumentDraft(d.documentId, "最后输入");
  });
  await actions.close({ editorIds: [d.editorId], savedOnly: true });
  expect(confirmDirty).not.toHaveBeenCalled();
  expect(editorStore.getState().openEditorIds).toEqual([d.editorId]);
});
test("确认过程中新增工作区标签时中止关闭", async () => {
  open();
  const { actions, confirmDirty } = setup("discard");
  confirmDirty.mockImplementationOnce(async () => {
    editorStore
      .getState()
      .openEditor({ kind: "workspaceFile", workspaceId: "old", filePath: "new.md" });
    return "discard";
  });
  const closeCore = mock(async () => {});
  await expect(actions.close(getWorkspaceCloseTargets("old"), closeCore)).rejects.toThrow(
    "新的工作区标签",
  );
  expect(closeCore).not.toHaveBeenCalled();
  expect(editorStore.getState().openEditorIds).toHaveLength(2);
});
