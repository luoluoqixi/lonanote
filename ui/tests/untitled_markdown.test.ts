import { expect, test } from "bun:test";

import { createEditorInitializePayload } from "../src/components/editor/bridge/editor_bridge_initialize";
import { editorStore } from "../src/stores/editor";

test("无标题笔记使用 Markdown 文件类型但仍无磁盘路径", () => {
  const { documentId, editorId } = editorStore.getState().openEditor({ kind: "untitled" });
  const state = editorStore.getState();
  const payload = createEditorInitializePayload(
    state.documentsById[documentId],
    state.editorsById[editorId],
    {} as Parameters<typeof createEditorInitializePayload>[2],
    {} as Parameters<typeof createEditorInitializePayload>[3],
    { available: false, reason: "untitled" },
  );
  expect(payload.document.fileName).toEndWith(".md");
  expect(payload.document.workspacePath).toBeNull();
  expect(payload.document.displayName).toBe(state.documentsById[documentId].title);
  state.closeEditor(editorId);
});
