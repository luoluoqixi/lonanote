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

test("PC 菜单按 Provider 能力提供路径动作，冻结多选目标且不提供移动端更多项", () => {
  let current = true;
  const copied: unknown[] = [];
  const removed: unknown[] = [];
  const actions = {
    isCurrent: () => current,
    open: () => {},
    create: () => {},
    rename: () => {},
    details: () => {},
    select: () => {},
    refresh: () => {},
    remove: (paths: string[]) => {
      removed.push(paths);
    },
    copyPath: (path: string, absolute: boolean) => {
      copied.push([path, absolute]);
    },
  };
  const options = {
    workspaceId: "w",
    epoch: 1,
    targetPaths: ["note.md"],
    targetDirectory: "",
    capabilities: {
      canRead: true,
      canWrite: true,
      canCreateDirectory: true,
      canDelete: true,
      canRename: true,
    },
    actions,
    desktop: true,
  };
  const virtual = createWorkspaceExplorerMenu(options);
  expect(virtual.some((item) => item.value === "reveal" || item.value === "copy-absolute")).toBe(
    false,
  );
  expect(virtual.some((item) => item.value === "select")).toBe(false);
  expect(virtual.find((item) => item.value === "details")?.disabled).toBe(false);
  virtual.find((item) => item.value === "copy-relative")?.onSelect?.();
  expect(copied).toEqual([["note.md", false]]);
  const targets = ["one.md", "two.md"];
  const native = createWorkspaceExplorerMenu({
    ...options,
    targetPaths: targets,
    nativePathAvailable: true,
  });
  targets[0] = "new.md";
  expect(native.find((item) => item.value === "copy-absolute")?.disabled).toBe(true);
  native.find((item) => item.value === "delete")?.onSelect?.();
  expect(removed).toEqual([["one.md", "two.md"]]);
  current = false;
  native.find((item) => item.value === "delete")?.onSelect?.();
  expect(removed).toHaveLength(1);
});

test("桌面文件只提供打开，文件夹和根目录在自身创建，详情固定右键目标", () => {
  const calls: unknown[] = [];
  let current = true;
  const options = {
    workspaceId: "w",
    epoch: 1,
    desktop: true,
    nativePathAvailable: true,
    capabilities: {
      canRead: true,
      canWrite: true,
      canCreateDirectory: true,
      canDelete: true,
      canRename: true,
    },
    actions: {
      isCurrent: () => current,
      open: (path: string) => {
        calls.push(["open", path]);
      },
      create: (path: string, kind: string) => {
        calls.push([kind, path]);
      },
      details: (path: string) => {
        calls.push(["details", path]);
      },
      rename: () => {},
      remove: () => {},
      select: () => {},
      refresh: () => {},
    },
  };
  const file = createWorkspaceExplorerMenu({
    ...options,
    targetPaths: ["docs/a.md"],
    targetDirectory: "docs",
  });
  expect(file.some((item) => item.value.startsWith("create-"))).toBe(false);
  file.find((item) => item.value === "open")?.onSelect?.();
  file.find((item) => item.value === "details")?.onSelect?.();
  expect(calls).toEqual([
    ["open", "docs/a.md"],
    ["details", "docs/a.md"],
  ]);

  for (const path of ["docs", ""]) {
    const folder = createWorkspaceExplorerMenu({
      ...options,
      targetPaths: [path],
      targetDirectory: path,
    });
    expect(folder.some((item) => item.value === "open")).toBe(false);
    folder.find((item) => item.value === "create-note")?.onSelect?.();
    folder.find((item) => item.value === "create-directory")?.onSelect?.();
    folder.find((item) => item.value === "details")?.onSelect?.();
    expect(calls.slice(-3)).toEqual([
      ["note", path],
      ["directory", path],
      ["details", path],
    ]);
    expect(folder.some((item) => item.value === "rename")).toBe(path !== "");
    expect(folder.some((item) => item.value === "delete")).toBe(path !== "");
  }
  current = false;
  const count = calls.length;
  file.find((item) => item.value === "details")?.onSelect?.();
  expect(calls).toHaveLength(count);
});
