import { expect, test } from "bun:test";

import {
  EditorWindowReloadedError,
  EditorWindowRpc,
} from "../src/components/editor/controllers/editor_window_rpc";

test("刷新取消旧 renderer 的等待请求，但允许新 renderer 继续通信", async () => {
  const base = { sessionId: "session", ownerWindowLabel: "owner", ownerEpoch: 1, checkpoint: null };
  const sent: { requestId: string; payload: unknown }[] = [];
  const rpc = new EditorWindowRpc(
    { ...base, windowLabel: "owner", role: "workbench" },
    async (_target, requestId, payload) => {
      sent.push({ requestId, payload });
    },
    async () => {},
  );
  try {
    const old = rpc.request("child", "projection", {});
    const rejected = old.catch((error) => error);
    rpc.resetTarget("child");
    expect(await rejected).toBeInstanceOf(EditorWindowReloadedError);
    const current = rpc.request("child", "projection", {});
    await rpc.receive({
      ...base,
      fromWindowLabel: "child",
      toWindowLabel: "owner",
      requestId: sent[0].requestId,
      payload: { kind: "response", ok: true, result: "stale" },
    });
    await rpc.receive({
      ...base,
      fromWindowLabel: "child",
      toWindowLabel: "owner",
      requestId: sent[1].requestId,
      payload: { kind: "response", ok: true, result: "current" },
    });
    expect(await current).toBe("current");
  } finally {
    rpc.dispose();
  }
});

test("连续5000次真实客户端请求均执行，淘汰的重复请求不能重新执行", async () => {
  const base = { sessionId: "session", ownerWindowLabel: "owner", ownerEpoch: 1, checkpoint: null };
  let owner!: EditorWindowRpc;
  let child!: EditorWindowRpc;
  let firstRequest: { id: string; payload: unknown } | undefined;
  let calls = 0;
  owner = new EditorWindowRpc(
    { ...base, windowLabel: "owner", role: "workbench" },
    async (_target, requestId, payload) => {
      await child.receive({
        ...base,
        fromWindowLabel: "owner",
        toWindowLabel: "child",
        requestId,
        payload,
      });
    },
    async () => {},
    100,
  );
  child = new EditorWindowRpc(
    { ...base, windowLabel: "child", role: "editor" },
    async (_target, requestId, payload) => {
      firstRequest ??= { id: requestId, payload };
      await owner.receive({
        ...base,
        fromWindowLabel: "child",
        toWindowLabel: "owner",
        requestId,
        payload,
      });
    },
    async () => {},
    100,
  );
  owner.handle("change", async () => ++calls);
  const failures: unknown[] = [];
  try {
    for (let i = 0; i < 5000; i++) {
      try {
        await child.request("owner", "change", { sequence: i });
      } catch (error) {
        failures.push(error);
      }
    }
    expect(failures).toHaveLength(0);
    expect(calls).toBe(5000);
    await owner.receive({
      ...base,
      fromWindowLabel: "child",
      toWindowLabel: "owner",
      requestId: firstRequest!.id,
      payload: firstRequest!.payload,
    });
    expect(calls).toBe(5000);
  } finally {
    owner.dispose();
    child.dispose();
  }
});
