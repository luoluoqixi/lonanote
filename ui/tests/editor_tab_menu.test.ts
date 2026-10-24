import { beforeEach, expect, test } from "bun:test";

import {
  getEditorTabCloseTargets,
  getEditorTabRef,
} from "../src/components/editor/desktop/editor_tab_menu_actions";
import { editorStore } from "../src/stores/editor";

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
test("菜单以右键目标为准，支持关闭其他、右侧、已保存、全部", () => {
  const a = editorStore.getState().openEditor({ kind: "untitled" });
  const b = editorStore.getState().openEditor({ kind: "untitled" }, { initialText: "草稿" });
  const c = editorStore
    .getState()
    .openViewer({ kind: "workspaceFile", workspaceId: "qa", filePath: "image.png" }, "image");
  const s = editorStore.getState();
  expect(getEditorTabCloseTargets("close", a.editorId, s)).toEqual([a.editorId]);
  expect(getEditorTabCloseTargets("closeOthers", a.editorId, s)).toEqual([b.editorId, c]);
  expect(getEditorTabCloseTargets("closeRight", b.editorId, s)).toEqual([c]);
  expect(getEditorTabCloseTargets("closeSaved", b.editorId, s)).toEqual([a.editorId, c]);
  expect(getEditorTabCloseTargets("closeAll", a.editorId, s)).toEqual([a.editorId, b.editorId, c]);
  expect(getEditorTabCloseTargets("closeAll", "closed", s)).toEqual([]);
  expect(getEditorTabRef(c, s)).toEqual({
    kind: "workspaceFile",
    workspaceId: "qa",
    filePath: "image.png",
  });
});
