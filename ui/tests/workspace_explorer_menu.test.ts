import { expect, test } from "bun:test";

import { createWorkspaceExplorerMenu } from "../src/components/workspaces/workspace_explorer/workspace_explorer_menu";

test("菜单固定业务路径、禁用能力与 destructive；旧会话和已删节点不执行", () => {
  let epoch = 1;
  const existing = new Set(["A", "B"]);
  const opened: string[] = [];
  const deleted: string[][] = [];
  const paths = ["A"];
  const items = createWorkspaceExplorerMenu({
    workspaceId: "w",
    epoch: 1,
    targetPaths: paths,
    targetDirectory: "A",
    capabilities: {
      canRead: true,
      canWrite: false,
      canCreateDirectory: false,
      canDelete: true,
      canRename: false,
    },
    actions: {
      isCurrent: (id, value, targets) =>
        id === "w" && value === epoch && targets.every((p) => existing.has(p)),
      open: (p) => {
        opened.push(p);
      },
      create: () => {},
      rename: () => {},
      remove: (p) => {
        deleted.push(p);
      },
      details: () => {},
      select: () => {},
      refresh: () => {},
    },
  });
  paths[0] = "B";
  items.find((i) => i.value === "open")?.onSelect?.();
  expect(opened).toEqual(["A"]);
  expect(items.find((i) => i.value === "rename")?.disabled).toBe(true);
  expect(items.find((i) => i.value === "delete")?.destructive).toBe(true);
  expect(items.find((i) => i.value === "create")?.subMenu?.length).toBe(2);
  existing.delete("A");
  items.find((i) => i.value === "delete")?.onSelect?.();
  expect(deleted).toEqual([]);
  existing.add("A");
  epoch = 2;
  items.find((i) => i.value === "open")?.onSelect?.();
  expect(opened).toEqual(["A"]);
});
