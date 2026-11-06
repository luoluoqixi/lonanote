import { expect, test } from "bun:test";

import { notifyWorkspaceOpenError } from "../src/components/workspaces/workspace_select/workspace_open_feedback";

test("跨窗口工作区占用使用信息提示，兼容 Rust 字符串和 Error", () => {
  for (const error of ["该工作区已在另一个窗口打开", new Error("该工作区已在另一个窗口打开")]) {
    const messages: string[] = [];
    notifyWorkspaceOpenError(error, {
      info: (message) => messages.push(`info:${message}`),
      error: (message) => messages.push(`error:${message}`),
    });
    expect(messages).toEqual(["info:该工作区已在另一个窗口打开"]);
  }
});

test("真正的打开失败保留 Rust 错误信息，未知错误使用兜底提示", () => {
  const messages: string[] = [];
  const toast = {
    info: (message: string) => messages.push(`info:${message}`),
    error: (message: string) => messages.push(`error:${message}`),
  };
  notifyWorkspaceOpenError("文件夹访问被拒绝", toast);
  notifyWorkspaceOpenError(new Error("工作区数据损坏"), toast);
  notifyWorkspaceOpenError(undefined, toast);
  expect(messages).toEqual([
    "error:文件夹访问被拒绝",
    "error:工作区数据损坏",
    "error:打开工作区失败",
  ]);
});
