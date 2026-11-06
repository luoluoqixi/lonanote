import { expect, test } from "bun:test";

import {
  getTreeDragSources,
  isTreeDropRegion,
  resolveTreeDrop,
  treeRowAtPoint,
} from "../src/components/workspaces/workspace_explorer/tree/tree_drag_model";
import type { WorkspaceTreeNodeRow } from "../src/components/workspaces/workspace_explorer/tree/tree_types";

const row = (path: string, directory = false): WorkspaceTreeNodeRow => ({
  kind: "node",
  key: path,
  path,
  parentPath: path.split("/").slice(0, -1).join("/"),
  depth: 0,
  isLoading: false,
  entry: {
    path,
    fileType: directory ? "directory" : "file",
    size: null,
    createTime: null,
    lastModifiedTime: null,
  },
});
const rows = [row("folder", true), row("folder/note.md"), row("other", true), row("root.md")];

test("拖动选中行保持多选并去掉父目录下重复来源，未选中行只拖自身", () => {
  expect(getTreeDragSources("folder", ["folder", "folder/note.md", "root.md"])).toEqual([
    "folder",
    "root.md",
  ]);
  expect(getTreeDragSources("other", ["folder", "root.md"])).toEqual(["other"]);
});

test("落在目录、文件及空白区分别移动到目录、文件父目录和根", () => {
  expect(resolveTreeDrop(["root.md"], rows, 0)).toEqual({
    directory: "folder",
    paths: ["root.md"],
    rowPath: "folder",
  });
  expect(resolveTreeDrop(["root.md"], rows, 1)).toEqual({
    directory: "folder",
    paths: ["root.md"],
    rowPath: "folder/note.md",
  });
  expect(resolveTreeDrop(["folder/note.md"], rows, 8)).toEqual({
    directory: "",
    paths: ["folder/note.md"],
    rowPath: null,
  });
});

test("拒绝自身和后代、状态行；同目录拖放无操作，混合选择仅移动目录不同的项", () => {
  expect(resolveTreeDrop(["folder"], rows, 0)).toBeNull();
  expect(resolveTreeDrop(["folder"], rows, 1)).toBeNull();
  expect(resolveTreeDrop(["folder/note.md"], rows, 0)).toBeNull();
  expect(resolveTreeDrop(["root.md"], rows, 8)).toBeNull();
  expect(resolveTreeDrop(["folder/note.md", "root.md"], rows, 0)?.paths).toEqual(["root.md"]);
  expect(
    resolveTreeDrop(
      ["root.md"],
      [{ kind: "loading", key: "loading", path: "folder", parentPath: "", depth: 1 }],
      0,
    ),
  ).toBeNull();
});

test("拖动命中换算包含滚动与缩放，视口外不会触发移动", () => {
  const bounds = { left: 20, top: 40, width: 200, height: 180, scaleY: 2 };
  expect(treeRowAtPoint(30, 101, bounds, 30, 30)).toBe(2);
  expect(treeRowAtPoint(10, 101, bounds, 30, 30)).toBeNull();
  expect(treeRowAtPoint(30, 220, bounds, 30, 30)).toBeNull();
});

test("文件命中高亮其整个父目录区域，包含兄弟和后代但不包含相似前缀", () => {
  const visible = [
    row("folder", true),
    row("folder/a.md"),
    row("folder/sub", true),
    row("folder/sub/b.md"),
    row("folder-other", true),
    row("root.md"),
  ];
  const target = resolveTreeDrop(["root.md"], visible, 1);
  expect(
    visible.filter((item) => isTreeDropRegion(item.path, target)).map((item) => item.path),
  ).toEqual(["folder", "folder/a.md", "folder/sub", "folder/sub/b.md"]);
  const unchanged = resolveTreeDrop(["folder/a.md"], visible, 1);
  expect(visible.some((item) => isTreeDropRegion(item.path, unchanged))).toBe(false);
  const rootTarget = resolveTreeDrop(["folder/a.md"], visible, visible.length);
  expect(visible.every((item) => isTreeDropRegion(item.path, rootTarget))).toBe(true);
});
