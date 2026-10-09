import { beforeEach, expect, mock, test } from "bun:test";

import type { ScanWorkspaceIdConflict } from "../src/api/commands/workspace/types";

const confirm = mock(async (_options: unknown): Promise<string | null> => "keep-a");
mock.module("rn-ui-kit", () => ({ confirmNative: confirm, Select: () => null }));

const { chooseScanIdConflictKeeper } =
  await import("../src/components/workspaces/workspace_select/scan_id_conflict_dialog");

function group(count: number): ScanWorkspaceIdConflict {
  return {
    conflictId: "scan-conflict",
    workspaceId: "duplicate-id",
    candidates: Array.from({ length: count }, (_, index) => ({
      displayName: `工作区 ${index}`,
      locationLabel: `/notes/folder-${index}`,
      isRegistered: index === 0,
      isOpen: false,
    })),
  };
}

beforeEach(() => {
  confirm.mockReset();
  confirm.mockImplementation(async () => "keep-a");
});

test("10 个重复文件夹仅逐对比较，每次三个固定按钮，最终可选择最后一个保留者", async () => {
  const conflict = group(10);
  confirm.mockResolvedValueOnce("keep-b");
  for (let index = 2; index < 9; index += 1) confirm.mockResolvedValueOnce("keep-a");
  confirm.mockResolvedValueOnce("keep-b");
  const before = JSON.stringify(conflict);
  expect(await chooseScanIdConflictKeeper(conflict)).toBe(9);
  expect(confirm).toHaveBeenCalledTimes(9);
  for (let index = 0; index < 9; index += 1) {
    expect(confirm.mock.calls[index][0]).toMatchObject({
      title: `工作区 ID 重复（${index + 1}/9）`,
      buttons: [
        { key: "skip", text: "跳过本组" },
        { key: "keep-a", text: `保留 folder-${index === 0 ? 0 : 1} 的ID` },
        { key: "keep-b", text: `保留 folder-${index + 1} 的ID` },
      ],
    });
  }
  expect(confirm.mock.calls[1][0]).toMatchObject({
    message: expect.stringContaining("folder-1（未注册）"),
  });
  expect(confirm.mock.calls[8][0]).toMatchObject({
    message: expect.stringContaining("确认后更新本组"),
  });
  expect(JSON.stringify(conflict)).toBe(before);
});

test("中途跳过丢弃整组选择，停止后续比较", async () => {
  confirm.mockResolvedValueOnce("keep-b").mockResolvedValueOnce("skip");
  expect(await chooseScanIdConflictKeeper(group(10))).toBeNull();
  expect(confirm).toHaveBeenCalledTimes(2);
});

test("关闭弹窗与跳过本组相同", async () => {
  confirm.mockResolvedValueOnce(null);
  expect(await chooseScanIdConflictKeeper(group(2))).toBeNull();
  expect(confirm).toHaveBeenCalledTimes(1);
});

test("两个重复文件夹展示真实文件夹名，省略 UUID 与沙盒路径", async () => {
  const conflict = group(2);
  conflict.candidates[0].displayName = "我的笔记";
  conflict.candidates[1].displayName = "我的笔记";
  const sandbox = "/private/var/mobile/Containers/Data/Application/app-id/Documents/workspaces";
  conflict.candidates[0].locationLabel = `${sandbox}/我的笔记`;
  conflict.candidates[1].locationLabel = `${sandbox}/我的笔记 复制`;
  expect(await chooseScanIdConflictKeeper(conflict)).toBe(0);
  expect(confirm).toHaveBeenCalledTimes(1);
  const options = confirm.mock.calls[0][0] as {
    message: string;
    title: string;
    buttons: { text: string }[];
  };
  expect(options.title).toBe("工作区 ID 重复");
  expect(options.message).toContain("我的笔记（已注册）\n我的笔记 复制（未注册）");
  expect(options.message).not.toContain(sandbox);
  expect(options.message).not.toContain(conflict.workspaceId);
  expect(options.buttons.map((button) => button.text)).toEqual([
    "跳过本组",
    "保留 我的笔记 的ID",
    "保留 我的笔记 复制 的ID",
  ]);
});
