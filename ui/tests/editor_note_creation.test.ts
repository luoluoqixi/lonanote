import { expect, test } from "bun:test";

import {
  getEditorNoteCreateParent,
  getQuickCreateParent,
} from "../src/components/editor/desktop/editor_note_creation";

test("菜单新建文件夹遵循 Explorer 选中文件的父目录，不跟随其他活动文件", () => {
  const ref = { kind: "workspaceFile", workspaceId: "w", filePath: "a/note.md" } as const;
  expect(
    getQuickCreateParent("directory", ref, "w", [{ path: "b/note.md", fileType: "file" }]),
  ).toBe("b");
  expect(getQuickCreateParent("directory", ref, "w", [], "current")).toBe("current");
  expect(getQuickCreateParent("note", ref, "w", [])).toBe("a");
});

test("选中的第一个文件夹优先于活动文件，混合选择跳过文件", () => {
  const ref = { kind: "workspaceFile", workspaceId: "w", filePath: "notes/a.md" } as const;
  const selected = [
    { path: "other/a.md", fileType: "file" },
    { path: "drafts", fileType: "directory" },
    { path: "archive", fileType: "directory" },
  ];
  expect(getEditorNoteCreateParent(ref, "w", selected)).toBe("drafts");
  expect(getEditorNoteCreateParent(null, "w", selected)).toBe("drafts");
  expect(getEditorNoteCreateParent(ref, "w", [selected[0]])).toBe("notes");
});

test("快速创建使用当前工作区活动文件所在目录", () => {
  expect(
    getEditorNoteCreateParent(
      { kind: "workspaceFile", workspaceId: "w", filePath: "notes/drafts/a.md" },
      "w",
    ),
  ).toBe("notes/drafts");
  expect(
    getEditorNoteCreateParent(
      { kind: "workspaceFile", workspaceId: "w", filePath: "images/a.png" },
      "w",
    ),
  ).toBe("images");
  expect(
    getEditorNoteCreateParent({ kind: "workspaceFile", workspaceId: "w", filePath: "a.md" }, "w"),
  ).toBe("");
});

test("没有活动文件、独立文件或其他工作区文件时回退根目录", () => {
  expect(getEditorNoteCreateParent(null, "w")).toBe("");
  expect(getEditorNoteCreateParent({ kind: "looseFile", absolutePath: "C:/notes/a.md" }, "w")).toBe(
    "",
  );
  expect(
    getEditorNoteCreateParent(
      { kind: "workspaceFile", workspaceId: "other", filePath: "notes/a.md" },
      "w",
    ),
  ).toBe("");
});
