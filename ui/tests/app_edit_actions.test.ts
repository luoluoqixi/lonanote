import { expect, test } from "bun:test";

import { editorCommandCoordinator } from "../src/components/editor/controllers/editor_command_coordinator";
import { editorInputLeaseCoordinator } from "../src/components/editor/controllers/editor_input_lease_coordinator";
import { editorStore } from "../src/stores/editor";

test("活动编辑器失焦后菜单仍取得输入权执行命令，并恢复焦点", async () => {
  const opened = editorStore.getState().openEditor({ kind: "untitled" });
  editorStore.getState().setActiveEditor(null);
  editorStore.getState().setEditorBridgeState(opened.editorId, "ready");
  const calls: string[] = [];
  const releaseLease = editorInputLeaseCoordinator.registerProvider(opened.editorId, {
    captureDocument: async () => ({ revision: 0, text: "" }),
    applyDocumentRevision: async () => ({ applied: true }),
    blur: async () => {},
    setInputEnabled: async () => {
      calls.push("lease");
      return { applied: true };
    },
  });
  const releaseCommand = editorCommandCoordinator.registerProvider(
    opened.editorId,
    async (command) => {
      calls.push(command.type);
      expect(editorStore.getState().documentsById[opened.documentId].editOwnerEditorId).toBe(
        opened.editorId,
      );
      return { applied: true, stateRevision: 0 };
    },
  );
  try {
    editorStore.getState().setActiveEditor(opened.editorId);
    expect(editorStore.getState().editorsById[opened.editorId].editorState.focused).toBe(false);
    await editorCommandCoordinator.executeMenuCommand(opened.editorId, { type: "history.undo" });
    expect(calls).toEqual(["lease", "history.undo", "editor.focus"]);
    calls.length = 0;
    editorStore.getState().setActiveEditor(null);
    await editorCommandCoordinator.executeMenuCommand(opened.editorId, { type: "history.redo" });
    expect(calls).toEqual([]);
  } finally {
    releaseCommand();
    releaseLease();
    editorStore.getState().closeEditor(opened.editorId);
  }
});

test("只读编辑器允许捕获选区和全选，不允许修改", async () => {
  const opened = editorStore.getState().openEditor({ kind: "untitled" }, { readOnly: true });
  const calls: string[] = [];
  const release = editorCommandCoordinator.registerProvider(opened.editorId, async (command) => {
    calls.push(command.type);
    return { applied: true, stateRevision: 0 };
  });
  await editorCommandCoordinator.execute(opened.editorId, { type: "selection.selectAll" });
  expect(calls).toEqual(["selection.selectAll"]);
  await expect(
    editorCommandCoordinator.execute(opened.editorId, { type: "selection.replace", text: "" }),
  ).rejects.toThrow();
  release();
  editorStore.getState().closeEditor(opened.editorId);
});
