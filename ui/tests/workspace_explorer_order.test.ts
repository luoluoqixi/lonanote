import { expect, test } from "bun:test";

import type { WorkspaceIndexEntry } from "../src/api/commands/workspace/types";
import { groupWorkspaceExplorerEntries } from "../src/components/workspaces/workspace_explorer/workspace_explorer_order";

function note(path: string, lastModifiedTime: number): WorkspaceIndexEntry {
  return { path, fileType: "file", size: 1, createTime: 1, lastModifiedTime };
}

test("修改时间静默更新时保持行顺序，刷新后才按新时间排序", () => {
  const original = [note("recent.md", 20), note("old.md", 10)];
  const current = [original[0], { ...original[1], lastModifiedTime: 30, size: 42 }];
  const sections = groupWorkspaceExplorerEntries(
    current,
    false,
    "none",
    "lastModifiedTime",
    original,
  );
  expect(sections[0].entries.map((entry) => entry.path)).toEqual(["recent.md", "old.md"]);
  expect(sections[0].entries[1]).toMatchObject({ lastModifiedTime: 30, size: 42 });
  const refreshed = groupWorkspaceExplorerEntries(current, false, "none", "lastModifiedTime");
  expect(refreshed[0].entries.map((entry) => entry.path)).toEqual(["old.md", "recent.md"]);
});

test("跨日期编辑不会迁移当前分组，刷新后才进入今天分组", () => {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const original = [
    note("today.md", today.getTime() / 1000),
    note("yesterday.md", yesterday.getTime() / 1000),
  ];
  const current = [original[0], { ...original[1], lastModifiedTime: today.getTime() / 1000 + 1 }];
  const sections = groupWorkspaceExplorerEntries(
    current,
    false,
    "date",
    "lastModifiedTime",
    original,
  );
  expect(
    sections.map((section) => [section.id, section.entries.map((entry) => entry.path)]),
  ).toEqual([
    ["today", ["today.md"]],
    ["yesterday", ["yesterday.md"]],
  ]);
  expect(sections[1].entries[0].lastModifiedTime).toBe(today.getTime() / 1000 + 1);
  const refreshed = groupWorkspaceExplorerEntries(current, false, "date", "lastModifiedTime");
  expect(
    refreshed.map((section) => [section.id, section.entries.map((entry) => entry.path)]),
  ).toEqual([["today", ["yesterday.md", "today.md"]]]);
});
