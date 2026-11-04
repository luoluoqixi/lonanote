import { expect, test } from "bun:test";

import { editorCommandCoordinator } from "../src/components/editor/controllers/editor_command_coordinator";
import { editorStore } from "../src/stores/editor";

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
