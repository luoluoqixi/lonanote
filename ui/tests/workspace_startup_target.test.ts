import { expect, test } from "bun:test";

import { resolveWorkspaceStartupTarget } from "../src/api/common/workspace_startup_target";

test("两个窗口刷新优先恢复各自绑定，不读取全局最近工作区", async () => {
  for (const id of ["workspace-a", "workspace-b"]) {
    const result = await resolveWorkspaceStartupTarget(
      { currentWorkspaceId: id, restoreLastWorkspace: false },
      async () => {
        throw new Error("刷新不得读取全局最近工作区");
      },
    );
    expect(result).toEqual({ workspaceId: id, alreadyOpen: true });
  }
});

test("空白窗口刷新保持空白，首次主窗口才允许使用最近工作区", async () => {
  let reads = 0;
  const loadLast = async () => {
    reads += 1;
    return "last";
  };
  expect(
    await resolveWorkspaceStartupTarget(
      { currentWorkspaceId: null, restoreLastWorkspace: false },
      loadLast,
    ),
  ).toBeNull();
  expect(reads).toBe(0);
  expect(
    await resolveWorkspaceStartupTarget(
      { currentWorkspaceId: null, restoreLastWorkspace: true },
      loadLast,
    ),
  ).toEqual({ workspaceId: "last", alreadyOpen: false });
  expect(reads).toBe(1);
  expect(
    await resolveWorkspaceStartupTarget(
      { currentWorkspaceId: null, restoreLastWorkspace: true },
      async () => null,
    ),
  ).toBeNull();
});
