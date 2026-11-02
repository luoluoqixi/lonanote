import { expect, test } from "bun:test";

import { editorInputLeaseCoordinator } from "../src/components/editor/controllers/editor_input_lease_coordinator";
import { toggleEditorPreviewMode } from "../src/components/editor/controllers/editor_preview_mode";
import { editorStore } from "../src/stores/editor";

test("进入预览先捕获 surface 最新内容，切回编辑后恢复输入权限", async () => {
  const { editorId, documentId } = editorStore.getState().openEditor({ kind: "untitled" });
  editorStore.getState().setEditorBridgeState(editorId, "ready");
  editorStore.getState().setDocumentEditOwner(documentId, editorId);
  let inputEnabled = true;
  const unregister = editorInputLeaseCoordinator.registerProvider(editorId, {
    captureDocument: async () => ({ revision: 10, text: "尚未同步的文字" }),
    applyDocumentRevision: async () => ({ applied: true }),
    blur: async () => {},
    setInputEnabled: async (enabled) => {
      inputEnabled = enabled;
      return { applied: true };
    },
  });
  try {
    await toggleEditorPreviewMode(editorId);
    expect(editorStore.getState().documentsById[documentId].draft).toBe("尚未同步的文字");
    expect(editorStore.getState().editorsById[editorId].previewMode).toBe(true);
    expect(inputEnabled).toBe(false);
    await toggleEditorPreviewMode(editorId);
    expect(editorStore.getState().editorsById[editorId].previewMode).toBe(false);
    expect(editorStore.getState().documentsById[documentId].editOwnerEditorId).toBe(editorId);
    expect(inputEnabled).toBe(true);
  } finally {
    unregister();
    editorStore.getState().closeEditor(editorId);
  }
});
