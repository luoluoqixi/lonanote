import { expect, test } from "bun:test";

import { getCreateEntrySelectionEnd } from "../src/components/workspaces/workspace_explorer/create_workspace_entry_input";

test("笔记仅选中最后一个扩展名前的名称", () => {
  expect(getCreateEntrySelectionEnd("未命名笔记.md", true)).toBe(5);
  expect(getCreateEntrySelectionEnd("archive.tar.md", true)).toBe(11);
});

test("没有扩展名的笔记与文件夹选中完整名称", () => {
  expect(getCreateEntrySelectionEnd("草稿", true)).toBe(2);
  expect(getCreateEntrySelectionEnd("新建文件夹", false)).toBe(5);
});
