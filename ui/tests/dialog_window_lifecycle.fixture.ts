import { expect, mock, test } from "bun:test";

// 只替换外部 Tauri 传输；请求监听、创建、取消及清理使用真实 dialogWindows。
const listeners = new Set<(event: { payload: unknown }) => void>();
const windows = new Set<string>();
let releaseCreate: (() => void) | undefined;
let creationStarted: (() => void) | undefined;
let cancelDuringCreate = false;
mock.module("../src/api/common/platform", () => ({ isDesktop: () => true, isTauri: () => true }));
mock.module("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({
    listen: async (_event: string, listener: (event: { payload: unknown }) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  }),
}));
mock.module("@tauri-apps/api/core", () => ({
  invoke: async (
    command: string,
    args: { request?: { requestId: string }; requestId?: string },
  ) => {
    if (command === "create_dialog_window") {
      if (cancelDuringCreate) {
        for (const listener of listeners)
          listener({
            payload: { requestId: args.request!.requestId, result: { __dialogDismissed: true } },
          });
        throw new Error("父窗口关闭导致 build 中止");
      }
      creationStarted?.();
      await new Promise<void>((resolve) => {
        releaseCreate = resolve;
      });
      windows.add(args.request!.requestId);
      return { requestId: args.request!.requestId };
    }
    if (command === "dismiss_owned_dialog") {
      windows.delete(args.requestId!);
      for (const listener of listeners)
        listener({ payload: { requestId: args.requestId, result: null } });
      return;
    }
    throw new Error(`未预期的命令 ${command}`);
  },
}));
const { dialogWindows } = await import("../src/api/commands/win/dialog_windows");

test("取消早于 create 完成时，完成创建后立即关闭并移除结果监听", async () => {
  const abort = new AbortController();
  const started = new Promise<void>((resolve) => {
    creationStarted = resolve;
  });
  const result = dialogWindows.open(
    {
      requestId: "pending-settings",
      dialogId: "settings",
      title: "设置",
      payload: { initialPageId: "global" },
      width: 880,
      height: 560,
    },
    { signal: abort.signal },
  );
  await started;
  abort.abort();
  releaseCreate!();
  await Promise.race([
    result,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("取消后 Dialog 请求仍未结束")), 500),
    ),
  ]);
  expect(windows.size).toBe(0);
  expect(listeners.size).toBe(0);
});

test("已取消的请求不创建任何窗口或监听", async () => {
  const abort = new AbortController();
  abort.abort();
  expect(
    await dialogWindows.open(
      {
        requestId: "already-cancelled",
        dialogId: "settings",
        title: "设置",
        payload: { initialPageId: "global" },
        width: 880,
        height: 560,
      },
      { signal: abort.signal },
    ),
  ).toBeUndefined();
  expect(windows.size).toBe(0);
  expect(listeners.size).toBe(0);
});

test("Rust 已回传关闭结果时，随后的 build 错误不能重新触发应用内弹窗", async () => {
  cancelDuringCreate = true;
  try {
    const result = await dialogWindows.open({
      requestId: "cancel-during-build",
      dialogId: "settings",
      title: "设置",
      payload: { initialPageId: "global" },
      width: 880,
      height: 560,
    });
    expect(result).toEqual({ __dialogDismissed: true });
    expect(listeners.size).toBe(0);
  } finally {
    cancelDuringCreate = false;
  }
});
