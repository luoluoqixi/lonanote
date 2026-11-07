import { beforeEach, expect, test } from "bun:test";

import { editorStore } from "../src/stores/editor/editor_store";

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
const ref = { kind: "workspaceFile" as const, workspaceId: "groups", filePath: "a.md" };
for (const direction of ["row", "column"] as const) {
  test(`向${direction === "row" ? "左" : "上"}拆分将新组放在原组之前`, () => {
    const first = editorStore.getState().openEditor(ref);
    const originalGroup = editorStore.getState().activeGroupId;
    const group = editorStore.getState().splitEditor(first.editorId, direction, "before");
    const layout = editorStore.getState().layout;
    expect(layout).toMatchObject({
      kind: "split",
      direction,
      first: { kind: "group", groupId: group },
      second: { kind: "group", groupId: originalGroup },
    });
    expect(editorStore.getState().activeGroupId).toBe(group);
  });
}
test("分组打开共享文档、组内去重", () => {
  const a = editorStore.getState().openEditor(ref);
  const group = editorStore.getState().splitEditor(a.editorId, "row");
  const b = editorStore.getState().openEditor(ref, { groupId: group });
  expect(b.documentId).toBe(a.documentId);
  expect(b.editorId).not.toBe(a.editorId);
  expect(b.reusedView).toBe(true);
  expect(editorStore.getState().groupsById[group].tabIds).toEqual([b.editorId]);
});
test("untitled 副本保留草稿和身份，空组折叠", () => {
  const a = editorStore.getState().openEditor({ kind: "untitled" }, { initialText: "草稿" });
  const group = editorStore.getState().splitEditor(a.editorId, "column");
  const b = editorStore.getState().activeEditorId!;
  expect(editorStore.getState().editorsById[b].documentId).toBe(a.documentId);
  editorStore.getState().closeEditor(b);
  expect(editorStore.getState().groupsById[group]).toBeUndefined();
  expect(editorStore.getState().layout.kind).toBe("group");
  expect(editorStore.getState().documentsById[a.documentId].draft).toBe("草稿");
});
test("viewer 支持复制和跨组移动", () => {
  const a = editorStore.getState().openViewer(ref, "pdf");
  const group = editorStore.getState().splitEditor(a, "row");
  const b = editorStore.getState().openViewer(ref, "pdf", { groupId: group });
  expect(b).not.toBe(a);
  editorStore.getState().moveEditorToGroup(a, group, b);
  expect(editorStore.getState().groupsById[group].tabIds).toEqual([b]);
  expect(Object.keys(editorStore.getState().groupsById)).toHaveLength(1);
});

test("跨组移动同一文档只保留目标标签，草稿和剩余引用不丢失", () => {
  const source = editorStore.getState().openEditor({ kind: "untitled" }, { initialText: "未保存" });
  const group = editorStore.getState().splitEditor(source.editorId, "row");
  const existing = editorStore.getState().activeEditorId!;
  editorStore.getState().moveEditorToGroup(source.editorId, group);
  const state = editorStore.getState();
  expect(state.openEditorIds).toEqual([existing]);
  expect(state.activeEditorId).toBe(existing);
  expect(state.documentsById[source.documentId].draft).toBe("未保存");
  expect(state.documentsById[source.documentId].attachedEditorIds).toEqual([existing]);
});
test("远端副本计入文档引用但不进入本地标签", () => {
  const a = editorStore.getState().openEditor({ kind: "untitled" }, { initialText: "远端草稿" });
  const remote = editorStore.getState().attachRemoteEditor(a.editorId, "editor-window-test");
  expect(editorStore.getState().openEditorIds).toEqual([a.editorId]);
  editorStore.getState().closeEditor(a.editorId);
  expect(editorStore.getState().documentsById[a.documentId].attachedEditorIds).toEqual([remote]);
  expect(editorStore.getState().editorsById[remote].windowLabel).toBe("editor-window-test");
  expect(Object.values(editorStore.getState().groupsById).flatMap((g) => g.tabIds)).toEqual([]);
});
test("嵌套拆分基于目标标签，移除工作区后只保留空组", () => {
  const a = editorStore.getState().openEditor(ref);
  const right = editorStore.getState().splitEditor(a.editorId, "row");
  const down = editorStore.getState().splitEditor(a.editorId, "column");
  expect(editorStore.getState().activeGroupId).toBe(down);
  const layout = editorStore.getState().layout;
  expect(layout.kind).toBe("split");
  if (layout.kind === "split") {
    expect(layout.first.kind).toBe("split");
    expect(layout.second).toEqual({ kind: "group", groupId: right });
  }
  editorStore.getState().removeWorkspacePaths("groups", ["a.md"]);
  expect(Object.keys(editorStore.getState().groupsById)).toHaveLength(1);
  expect(editorStore.getState().activeEditorId).toBeNull();
  expect(editorStore.getState().layout.kind).toBe("group");
});
test("重排非活动标签不改变组的编辑目标", () => {
  const a = editorStore.getState().openEditor(ref);
  const b = editorStore.getState().openEditor({ kind: "untitled" });
  editorStore.getState().moveEditor(a.editorId, null);
  expect(editorStore.getState().activeEditorId).toBe(b.editorId);
  editorStore.getState().setActiveEditor(null);
  expect(editorStore.getState().activeEditorId).toBeNull();
});
test("只剩远端viewer时本地重新打开产生本地标签", () => {
  const a = editorStore.getState().openViewer(ref, "pdf");
  const remote = editorStore.getState().attachRemoteEditor(a, "editor-window-test");
  editorStore.getState().closeEditor(a);
  const local = editorStore.getState().openViewer(ref, "pdf");
  expect(local).not.toBe(remote);
  expect(editorStore.getState().openEditorIds).toEqual([local]);
});

test("远端直接打开不改变owner活动目标和本地标签，文件共享文档", () => {
  const local = editorStore.getState().openEditor(ref);
  const before = editorStore.getState();
  const remote = before.openRemoteEditor(ref, "aux");
  const other = editorStore
    .getState()
    .openRemoteEditor({ kind: "looseFile", absolutePath: "C:/remote.md" }, "aux");
  expect(remote.documentId).toBe(local.documentId);
  expect(remote.editorId).not.toBe(local.editorId);
  expect(editorStore.getState().openRemoteEditor(ref, "aux").editorId).toBe(remote.editorId);
  const state = editorStore.getState();
  expect(state.openEditorIds).toEqual(before.openEditorIds);
  expect(state.activeEditorId).toBe(local.editorId);
  expect(state.activeGroupId).toBe(before.activeGroupId);
  expect(state.groupsById).toEqual(before.groupsById);
  expect(state.layout).toEqual(before.layout);
  expect(state.editorsById[other.editorId].windowLabel).toBe("aux");
  expect(state.documentsById[other.documentId].loadState).toBe("idle");
  const untitled = state.openRemoteEditor({ kind: "untitled" }, "aux", {
    initialText: "远端新草稿",
  });
  expect(editorStore.getState().documentsById[untitled.documentId].draft).toBe("远端新草稿");
  expect(editorStore.getState().openEditorIds).toEqual(before.openEditorIds);
});

test("远端成员销毁恢复文本和viewer为本地标签，保留原文档", () => {
  const remote = editorStore
    .getState()
    .openRemoteEditor({ kind: "untitled" }, "aux", { initialText: "必须可见的草稿" });
  editorStore.getState().restoreRemoteEditor(remote.editorId);
  const state = editorStore.getState();
  expect(state.openEditorIds).toEqual([remote.editorId]);
  expect(state.editorsById[remote.editorId].windowLabel).toBeUndefined();
  expect(state.documentsById[remote.documentId].draft).toBe("必须可见的草稿");
  const viewer = state.openViewer(ref, "pdf");
  const remoteViewer = editorStore.getState().attachRemoteViewer(viewer, "aux");
  editorStore.getState().closeEditor(viewer);
  editorStore.getState().restoreRemoteEditor(remoteViewer);
  expect(editorStore.getState().viewersById[remoteViewer].windowLabel).toBeUndefined();
  expect(editorStore.getState().openEditorIds).toEqual([remote.editorId, remoteViewer]);
});

test("远端直接打开viewer不改变owner本地活动标签", () => {
  const local = editorStore.getState().openEditor({ kind: "untitled" });
  const viewer = editorStore.getState().openRemoteViewer(ref, "pdf", "aux");
  expect(editorStore.getState().openRemoteViewer(ref, "pdf", "aux")).toBe(viewer);
  expect(editorStore.getState().openEditorIds).toEqual([local.editorId]);
  expect(editorStore.getState().activeEditorId).toBe(local.editorId);
  expect(editorStore.getState().viewersById[viewer].groupId).toBeNull();
});

test("文档所有文本入口使用canonical LF，加载CRLF不dirty且保留原fingerprint", () => {
  const opened = editorStore.getState().openEditor(ref, { initialText: "甲\r\n乙\r丙" });
  const id = opened.documentId;
  expect(editorStore.getState().documentsById[id].draft).toBe("甲\n乙\n丙");
  expect(editorStore.getState().documentsById[id].savedText).toBe("甲\n乙\n丙");
  const fingerprint = { size: 19, modifiedAt: 42 };
  editorStore.getState().setDocumentPersistedSnapshot(id, "甲\r\n乙", fingerprint);
  const loaded = editorStore.getState().documentsById[id];
  expect(loaded.draft).toBe("甲\n乙");
  expect(loaded.savedRevision).toBe(loaded.draftRevision);
  expect(loaded.savedFingerprint).toEqual(fingerprint);
  editorStore.getState().setDocumentDraft(id, "甲\r\n乙\r\n丁");
  const edited = editorStore.getState().documentsById[id];
  expect(edited.draft).toBe("甲\n乙\n丁");
  editorStore.getState().markDocumentSaved(id, edited.draftRevision, "甲\r\n乙\r\n丁", fingerprint);
  const saved = editorStore.getState().documentsById[id];
  expect(saved.savedText).toBe(saved.draft);
  expect(saved.savedRevision).toBe(saved.draftRevision);
});
