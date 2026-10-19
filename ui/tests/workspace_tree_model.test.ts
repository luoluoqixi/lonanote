import { expect, test } from "bun:test";

import type { WorkspaceIndexEntry } from "../src/api/commands/workspace/types";
import {
  flattenVisibleRows,
  resolveTreeFocus,
  selectTreePath,
} from "../src/components/workspaces/workspace_explorer/tree/tree_model";
import type { ExplorerDirectory } from "../src/stores/workspace/workspace_explorer_store";

const entry = (
  path: string,
  fileType: "directory" | "file" = "directory",
): WorkspaceIndexEntry => ({
  path,
  fileType,
  createTime: null,
  lastModifiedTime: null,
  size: null,
});
const directory = (path: string, entries: WorkspaceIndexEntry[]): ExplorerDirectory => ({
  snapshot: { path, entries },
  loading: false,
  error: null,
  stale: false,
  requestId: 1,
});
const byName = (entries: WorkspaceIndexEntry[]) =>
  [...entries].sort((a, b) => a.path.localeCompare(b.path));
const directories = {
  "": directory("", [entry("B", "file"), entry("A")]),
  A: directory("A", [entry("A/a.md", "file")]),
};

test("仅展开链扁平化，层级稳定，不修改缓存；未加载与空目录不同", () => {
  expect(flattenVisibleRows(directories, [], byName).map((r) => r.path)).toEqual(["A", "B"]);
  const rows = flattenVisibleRows(directories, ["A"], byName);
  expect(rows.map((r) => [r.path, r.depth])).toEqual([
    ["A", 0],
    ["A/a.md", 1],
    ["B", 0],
  ]);
  expect(directories[""].snapshot?.entries[0].path).toBe("B");
  const unloaded = flattenVisibleRows({ "": directories[""] }, ["A"], byName);
  expect(unloaded[1].kind).toBe("loading");
  const empty = flattenVisibleRows({ "": directories[""], A: directory("A", []) }, ["A"], byName);
  expect(empty.map((r) => r.path)).toEqual(["A", "B"]);
});
test("状态行不参与选择，range 仅含可见节点，失效 anchor 回退目标", () => {
  const rows = flattenVisibleRows({ "": directories[""] }, ["A"], byName);
  expect(
    selectTreePath({ rows, selectedPaths: [], anchorPath: "A", targetPath: "B", mode: "range" }),
  ).toEqual({ selectedPaths: ["A", "B"], anchorPath: "A" });
  expect(
    selectTreePath({
      rows,
      selectedPaths: ["A"],
      anchorPath: "hidden",
      targetPath: "B",
      mode: "range",
    }).selectedPaths,
  ).toEqual(["B"]);
  expect(
    selectTreePath({ rows, selectedPaths: ["A"], anchorPath: "A", targetPath: "B", mode: "toggle" })
      .selectedPaths,
  ).toEqual(["A", "B"]);
});
test("重排保持 path 焦点，隐藏后落祖先，删除后落邻行", () => {
  const before = flattenVisibleRows(directories, ["A"], byName);
  const collapsed = flattenVisibleRows(directories, [], byName);
  expect(resolveTreeFocus("A/a.md", before, collapsed)).toBe("A");
  expect(resolveTreeFocus("B", before, collapsed)).toBe("B");
  expect(resolveTreeFocus("B", before, collapsed.slice(0, 1))).toBe("A");
});
