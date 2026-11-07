import { expect, test } from "bun:test";

import { listenExternalFileDrop } from "../src/api/commands/win/external_file_drop_events";

test("原生文件拖放定向 WebviewWindow，真实 SDK 监听必须使用相同目标类型", async () => {
  const listeners: { event: string; target: { kind: string; label: string }; handler: number }[] =
    [];
  const callbacks = new Map<number, (event: unknown) => void>();
  let unregistered = false;
  (globalThis as any).window = {
    __TAURI_INTERNALS__: {
      metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main" } },
      transformCallback: (callback: (event: unknown) => void) => {
        const id = callbacks.size + 1;
        callbacks.set(id, callback);
        return id;
      },
      invoke: async (command: string, args: any) => {
        if (command === "plugin:event|listen") {
          listeners.push(args);
          return 1;
        }
        if (command === "plugin:event|unlisten") return;
        throw new Error(command);
      },
    },
    __TAURI_EVENT_PLUGIN_INTERNALS__: {
      unregisterListener: () => {
        unregistered = true;
      },
    },
  };
  const received: unknown[] = [];
  const stop = await listenExternalFileDrop((payload) => received.push(payload));
  const payload = { token: "native-file-ticket", x: 80, y: 160 };
  // 对应 Rust emit_to 的精确类型过滤，不把 Webview 和 WebviewWindow 当成同一种目标。
  for (const listener of listeners) {
    if (listener.target.kind === "WebviewWindow" && listener.target.label === "main") {
      callbacks.get(listener.handler)!({ event: listener.event, id: 1, payload });
    }
  }
  expect(received).toEqual([payload]);
  expect(listeners[0].event).toBe("lonanote://external-file-drop");
  await stop();
  expect(unregistered).toBe(true);
});
