import assert from "node:assert/strict";
import { test } from "node:test";

import { applyEditorFocusCommand } from "./focus_command";

test("菜单恢复输入焦点不调用会移动光标的 focus", () => {
  const calls: string[] = [];
  const editor = {
    focus: () => {
      calls.push("end");
    },
    focusInput: () => {
      calls.push("input");
    },
  };
  applyEditorFocusCommand(editor, { type: "editor.focus", preserveSelection: true });
  assert.deepEqual(calls, ["input"]);
  applyEditorFocusCommand(editor, { type: "editor.focus" });
  assert.deepEqual(calls, ["input", "end"]);
});
