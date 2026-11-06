import { expect, mock, test } from "bun:test";

const listeners: (() => void)[] = [];
const calls: string[] = [];
mock.module("@tauri-apps/api/core", () => ({
  invoke: async (name: string) => {
    calls.push(name);
  },
}));
mock.module("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({
    listen: async () => {
      const stop = mock(() => {});
      listeners.push(stop);
      return stop;
    },
  }),
}));
const { regCallbackFunction } = await import("../src/api/invoke/invoke.web");

test("旧 callback cleanup 不得卸载同 key 的新注册", async () => {
  const old = await regCallbackFunction("test", async () => "old");
  const latest = await regCallbackFunction("test", async () => "new");
  calls.length = 0;
  old();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(calls).not.toContain("unreg_callback_function");
  expect(listeners[1]).not.toHaveBeenCalled();
  latest();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(calls).toContain("unreg_callback_function");
});
