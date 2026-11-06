import { expect, test } from "bun:test";

import { createWorkspaceFileClipboard } from "../src/stores/workspace/workspace_file_clipboard";

test("剪切仅消费成功项，旧操作不得消费新记录；复制可重复", () => {
  const clipboard = createWorkspaceFileClipboard();
  const first = clipboard.record("a", "cut", [
    { path: "folder" },
    { path: "folder/n.md" },
    { path: "b.md" },
  ]);
  expect(clipboard.getSnapshot()?.sources.map((s) => s.path)).toEqual(["folder", "b.md"]);
  clipboard.consumeSucceeded(first.version, ["folder"]);
  expect(clipboard.getSnapshot()?.sources.map((s) => s.path)).toEqual(["b.md"]);
  clipboard.record("a", "copy", [{ path: "new.md" }]);
  clipboard.consumeSucceeded(first.version, ["b.md"]);
  expect(clipboard.getSnapshot()?.sources[0].path).toBe("new.md");
  clipboard.consumeSucceeded(clipboard.getSnapshot()!.version, ["new.md"]);
  expect(clipboard.getSnapshot()).not.toBeNull();
  clipboard.workspaceChanged("b");
  expect(clipboard.getSnapshot()).toBeNull();
});
