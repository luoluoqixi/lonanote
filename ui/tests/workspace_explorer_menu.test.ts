import { expect, test } from "bun:test";

import { createWorkspaceExplorerMenu } from "../src/components/workspaces/workspace_explorer/workspace_explorer_menu";

test("在其他应用中打开仅用于桌面本机文件，并校验多选、权限和会话", () => {
  let current = true;
  const opened: string[] = [];
  const options = {
    workspaceId: "w",
    epoch: 1,
    desktop: true,
    nativePathAvailable: true,
    targetPaths: ["docs/a.pdf"],
    targetDirectory: "docs",
    capabilities: {
      canRead: true,
      canWrite: true,
      canCreateDirectory: true,
      canDelete: true,
      canRename: true,
    },
    actions: {
      isCurrent: () => current,
      open: () => {},
      create: () => {},
      rename: () => {},
      remove: () => {},
      details: () => {},
      select: () => {},
      refresh: () => {},
      openExternal: (path: string) => {
        opened.push(path);
      },
    },
  };
  const find = (extra = {}) =>
    createWorkspaceExplorerMenu({ ...options, ...extra }).find(
      (item) => item.value === "open-external",
    );
  const item = find();
  expect(item?.label).toBe("在其他应用中打开");
  item?.onSelect?.();
  expect(opened).toEqual(["docs/a.pdf"]);
  current = false;
  item?.onSelect?.();
  expect(opened).toHaveLength(1);
  for (const extra of [
    { desktop: false },
    { nativePathAvailable: false },
    { targetPaths: ["docs"] },
    { targetPaths: [""], targetDirectory: "" },
  ])
    expect(find(extra)).toBeUndefined();
  current = true;
  for (const extra of [
    { targetPaths: ["docs/a.pdf", "docs/b.pdf"] },
    { capabilities: { ...options.capabilities, canRead: false } },
  ]) {
    const disabled = find(extra);
    expect(disabled?.disabled).toBe(true);
    disabled?.onSelect?.();
  }
  expect(opened).toHaveLength(1);
});

test("桌面文件夹菜单按展开状态提供动作，文件、根目录、多选和移动模式不提供", () => {
  const calls: unknown[] = [];
  let current = true;
  const options = {
    workspaceId: "w",
    epoch: 1,
    desktop: true,
    targetPaths: ["docs"],
    targetDirectory: "docs",
    expanded: false,
    capabilities: {
      canRead: true,
      canWrite: true,
      canCreateDirectory: true,
      canDelete: true,
      canRename: true,
    },
    actions: {
      isCurrent: () => current,
      open: () => {},
      create: () => {},
      rename: () => {},
      remove: () => {},
      details: () => {},
      select: () => {},
      refresh: () => {},
      setExpanded: (path: string, expanded: boolean) => {
        calls.push([path, expanded]);
      },
    },
  };
  const expand = createWorkspaceExplorerMenu(options).find((item) => item.value === "expand");
  expect(expand?.label).toBe("展开");
  expand?.onSelect?.();
  const collapse = createWorkspaceExplorerMenu({ ...options, expanded: true }).find(
    (item) => item.value === "collapse",
  );
  expect(collapse?.label).toBe("折叠");
  collapse?.onSelect?.();
  expect(calls).toEqual([
    ["docs", true],
    ["docs", false],
  ]);
  current = false;
  expand?.onSelect?.();
  expect(calls).toHaveLength(2);
  for (const extra of [
    { targetPaths: ["docs/a.md"] },
    { targetPaths: [""], targetDirectory: "" },
    { targetPaths: ["docs", "other"] },
    { desktop: false },
  ]) {
    expect(
      createWorkspaceExplorerMenu({ ...options, ...extra }).some(
        (item) => item.value === "expand" || item.value === "collapse",
      ),
    ).toBe(false);
  }
});

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
