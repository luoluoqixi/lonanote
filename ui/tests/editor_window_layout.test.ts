import { expect, test } from "bun:test";

import { restoreEditorWindowLayout } from "../src/components/editor/controllers/editor_window_layout";

test("辅助刷新恢复嵌套布局并保留checkpoint之后新增标签", () => {
  const layout = {
    kind: "split" as const,
    splitId: "s",
    direction: "row" as const,
    ratio: 0.4,
    first: { kind: "group" as const, groupId: "a" },
    second: { kind: "group" as const, groupId: "b" },
  };
  const restored = restoreEditorWindowLayout(
    {
      layout,
      groupsById: {
        a: { groupId: "a", tabIds: ["one"], activeTabId: "one" },
        b: { groupId: "b", tabIds: ["two"], activeTabId: "two" },
      },
      activeGroupId: "b",
      activeEditorId: "two",
      openEditorIds: ["one", "two"],
    },
    ["one", "two", "three"],
  );
  expect(restored.layout).toEqual(layout);
  expect(restored.groupsById.b.tabIds).toEqual(["two", "three"]);
  expect(restored.activeEditorId).toBe("two");
});

test("窗口checkpoint捕获每个view独立状态与偏好", async () => {
  const { editorStore } = await import("../src/stores/editor/editor_store");
  const { captureEditorWindowLayout } =
    await import("../src/components/editor/controllers/editor_window_layout");
  const opened = editorStore.getState().openEditor({ kind: "untitled" });
  const current = editorStore.getState().editorsById[opened.editorId];
  editorStore
    .getState()
    .setEditorStateSnapshot(opened.editorId, { ...current.editorState, row: 7, column: 9 });
  editorStore.getState().setEditorPreferenceOverrides(opened.editorId, { lineNumbers: true });
  editorStore.getState().setEditorPreviewMode(opened.editorId, true);
  const captured = captureEditorWindowLayout(editorStore.getState());
  expect(captured.viewStates?.[opened.editorId]?.editorState.row).toBe(7);
  expect(captured.viewStates?.[opened.editorId]?.preferenceOverrides).toEqual({
    lineNumbers: true,
  });
  expect(captured.viewStates?.[opened.editorId]?.previewMode).toBe(true);
  editorStore.getState().closeEditor(opened.editorId);
});
