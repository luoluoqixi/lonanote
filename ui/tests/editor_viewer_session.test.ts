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
const ref = { kind: "workspaceFile" as const, workspaceId: "qa", filePath: "A/image.png" };

test("查看器去重并与文本共享标签顺序，切换和关闭不改变 dirty 文本", () => {
  const text = editorStore.getState().openEditor({ kind: "untitled" }, { initialText: "草稿" });
  const image = editorStore.getState().openViewer(ref, "image");
  expect(editorStore.getState().openViewer(ref, "image")).toBe(image);
  expect(editorStore.getState().openEditorIds).toEqual([text.editorId, image]);
  expect(editorStore.getState().documentIds).toHaveLength(1);
  expect(editorStore.getState().activeEditorId).toBe(image);
  editorStore.getState().closeEditor(image);
  expect(editorStore.getState().activeEditorId).toBe(text.editorId);
  expect(editorStore.getState().documentsById[text.documentId].draft).toBe("草稿");
});
test("目录重命名与删除同步查看器身份，路径保留期间拒绝打开", () => {
  const image = editorStore.getState().openViewer(ref, "image");
  editorStore.getState().renameWorkspacePath("qa", "A", "B");
  expect(editorStore.getState().viewersById[image].ref.filePath).toBe("B/image.png");
  expect(editorStore.getState().openViewer({ ...ref, filePath: "B/image.png" }, "image")).toBe(
    image,
  );
  const release = editorStore.getState().reserveWorkspacePaths("qa", ["B"]);
  expect(() =>
    editorStore.getState().openViewer({ ...ref, filePath: "B/video.mp4" }, "video"),
  ).toThrow();
  release();
  editorStore.getState().removeWorkspacePaths("qa", ["B"]);
  expect(editorStore.getState().openEditorIds).toEqual([]);
  expect(editorStore.getState().activeEditorId).toBeNull();
});

test("工作区关闭销毁查看器，重开同一路径创建新 surface，文本草稿保留", () => {
  const text = editorStore
    .getState()
    .openEditor(
      { kind: "workspaceFile", workspaceId: "qa", filePath: "note.md" },
      { initialText: "草稿" },
    );
  const first = editorStore.getState().openViewer(ref, "image");
  editorStore.getState().closeWorkspaceViewers("qa");
  expect(editorStore.getState().viewersById[first]).toBeUndefined();
  expect(editorStore.getState().documentsById[text.documentId].draft).toBe("草稿");
  expect(editorStore.getState().openViewer(ref, "image")).not.toBe(first);
});
