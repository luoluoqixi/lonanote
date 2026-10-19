import { expect, mock, test } from "bun:test";

const calls: { command: string; args: unknown }[] = [];
mock.module("@/api/invoke", () => ({
  invoke: async (command: string, args: unknown) => {
    calls.push({ command, args });
    return command.endsWith("get_directory") ? { path: "", entries: [] } : undefined;
  },
}));
const { workspaceIndex } = await import("../src/api/commands/workspace/workspace_index");
test("目录查询默认重读，根路径与空目录保持快照契约", async () => {
  calls.length = 0;
  const snapshot = await workspaceIndex.getDirectory("w", "");
  await workspaceIndex.getDirectory("w", "notes", { reload: false });
  await workspaceIndex.refresh("w");
  expect(calls).toEqual([
    {
      command: "workspace.index.get_directory",
      args: { workspaceId: "w", path: "", reload: true },
    },
    {
      command: "workspace.index.get_directory",
      args: { workspaceId: "w", path: "notes", reload: false },
    },
    { command: "workspace.index.refresh", args: { workspaceId: "w" } },
  ]);
  expect(snapshot).toEqual({ path: "", entries: [] });
});
