import { expect, test } from "bun:test";

import { registerEditorMenuInvalidation } from "../src/components/editor/controllers/editor_menu_lifecycle";
import { executeEditorMenuAction } from "../src/components/editor/desktop/editor_menu_actions";
import { editorStore } from "../src/stores/editor/editor_store";

test("粘贴等待期间切换标签再切回，旧菜单保持失效", async () => {
  const first = editorStore.getState().openEditor({ kind: "untitled" });
  const second = editorStore.getState().openEditor({ kind: "untitled" });
  editorStore.getState().setActiveEditor(first.editorId);
  let valid = true;
  const stop = registerEditorMenuInvalidation(first.editorId, () => {
    valid = false;
  });
  const commands: unknown[] = [];
  let resolveRead!: (text: string) => void;
  const pending = executeEditorMenuAction("paste", {
    text: "",
    isCurrent: () => valid && editorStore.getState().activeEditorId === first.editorId,
    execute: async (command) => {
      commands.push(command);
    },
    clipboard: {
      readText: () =>
        new Promise<string>((resolve) => {
          resolveRead = resolve;
        }),
      writeText: async () => {},
    },
  });
  editorStore.getState().setActiveEditor(second.editorId);
  editorStore.getState().setActiveEditor(first.editorId);
  resolveRead("迟到内容");
  await pending;
  stop();
  expect(valid).toBe(false);
  expect(commands).toEqual([]);
});
