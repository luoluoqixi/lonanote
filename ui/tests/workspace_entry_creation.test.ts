import { expect, test } from "bun:test";

import {
  getDefaultWorkspaceEntryName,
  getWorkspaceEntryCreateParent,
} from "../src/api/common/utils/workspace_entry_name";

test("创建位置跟随选中项，未选择时使用当前目录", () => {
  expect(getWorkspaceEntryCreateParent({ path: "notes/a.md", fileType: "file" })).toBe("notes");
  expect(getWorkspaceEntryCreateParent({ path: "notes/archive", fileType: "directory" })).toBe(
    "notes/archive",
  );
  expect(getWorkspaceEntryCreateParent({ path: "a.md", fileType: "file" })).toBe("");
  expect(getWorkspaceEntryCreateParent(undefined, "notes")).toBe("notes");
  expect(getWorkspaceEntryCreateParent(undefined)).toBe("");
});

test("弹窗与快速创建共用递增命名，文件夹和文件均参与避让", () => {
  const entries = [
    { path: "notes/未命名笔记.md" },
    { path: "notes/未命名笔记 2.md" },
    { path: "notes/新建文件夹" },
    { path: "notes/新建文件夹 2" },
  ];
  expect(getDefaultWorkspaceEntryName(entries, "note")).toBe("未命名笔记 3.md");
  expect(getDefaultWorkspaceEntryName(entries, "directory")).toBe("新建文件夹 3");
  expect(getDefaultWorkspaceEntryName([], "note")).toBe("未命名笔记.md");
  expect(getDefaultWorkspaceEntryName([], "directory")).toBe("新建文件夹");
});
