import { expect, test } from "bun:test";

import { EditorWindowRpc } from "../src/components/editor/controllers/editor_window_rpc";

const bootstrap = {
  windowLabel: "owner",
  role: "workbench" as const,
  sessionId: "s",
  ownerWindowLabel: "owner",
  ownerEpoch: 1,
  checkpoint: null,
};

test("销毁通知迟到时忽略已关闭目标的回复失败，仍报告真实跨会话错误", async () => {
  for (const failure of ["目标编辑器窗口已关闭", "不允许跨会话或辅助窗口之间直接通信"]) {
    const rpc = new EditorWindowRpc(
      bootstrap,
      async () => {
        throw failure;
      },
      async () => {},
    );
    rpc.handle("finish-close", async () => true);
    const receiving = rpc.receive({
      fromWindowLabel: "child",
      toWindowLabel: "owner",
      sessionId: "s",
      ownerEpoch: 1,
      requestId: "close:1",
      payload: { kind: "request", method: "finish-close", args: null },
    });
    try {
      if (failure === "目标编辑器窗口已关闭") {
        await receiving;
        await expect(rpc.request("child", "projection", null)).rejects.toThrow(failure);
      } else await expect(receiving).rejects.toBe(failure);
    } finally {
      rpc.dispose();
    }
  }
});

test("成员销毁时立即结束等待，并且不向已销毁成员发送迟到回复", async () => {
  const sent: unknown[] = [];
  let committed = false;
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const rpc = new EditorWindowRpc(
    bootstrap,
    async (_target, _id, payload) => {
      sent.push(payload);
    },
    async () => {},
  );
  rpc.onCommitted(() => {
    committed = true;
  });
  rpc.handle("ready", async () => {
    entered();
    await gate;
    return null;
  });
  const receiving = rpc.receive({
    fromWindowLabel: "child",
    toWindowLabel: "owner",
    sessionId: "s",
    ownerEpoch: 1,
    requestId: "ready:1",
    payload: { kind: "request", method: "ready", args: null },
  });
  await started;
  const pending = rpc.request("child", "projection", null).catch((error) => error);
  rpc.disconnectTarget("child");
  expect((await pending).message).toBe("目标编辑器窗口已关闭");
  release();
  await receiving;
  expect(sent).toHaveLength(1);
  expect(committed).toBe(false);
  await expect(rpc.request("child", "projection", null)).rejects.toThrow("目标编辑器窗口已关闭");
});
test("重复请求只执行一次，checkpoint失败不确认成功", async () => {
  const sent: unknown[] = [];
  let writes = 0;
  let calls = 0;
  const rpc = new EditorWindowRpc(
    bootstrap,
    async (_target, _id, payload) => {
      sent.push(payload);
    },
    async () => {
      writes++;
      if (writes === 1) throw Error("checkpoint failed");
    },
  );
  rpc.handle("save", async () => {
    calls++;
    return "saved";
  });
  const event = {
    fromWindowLabel: "child",
    toWindowLabel: "owner",
    sessionId: "s",
    ownerEpoch: 1,
    requestId: "one",
    payload: { kind: "request", method: "save", args: null },
  };
  await rpc.receive(event);
  await rpc.receive(event);
  expect(calls).toBe(1);
  expect(writes).toBe(2);
  expect(sent).toEqual([
    { kind: "response", ok: false, error: "checkpoint failed" },
    { kind: "response", ok: true, result: "saved" },
  ]);
});
test("过期epoch不执行，失联后拒绝请求", async () => {
  let calls = 0;
  const rpc = new EditorWindowRpc(
    bootstrap,
    async () => {},
    async () => {},
  );
  rpc.handle("save", async () => {
    calls++;
  });
  await rpc.receive({
    fromWindowLabel: "child",
    toWindowLabel: "owner",
    sessionId: "s",
    ownerEpoch: 0,
    requestId: "old",
    payload: { kind: "request", method: "save", args: null },
  });
  expect(calls).toBe(0);
  rpc.dispose();
  await expect(rpc.request("owner", "save", null)).rejects.toThrow();
});

test("辅助窗口不能向owner注入文档投影", async () => {
  let injected = false;
  const replies: unknown[] = [];
  const rpc = new EditorWindowRpc(
    bootstrap,
    async (_target, _id, payload) => {
      replies.push(payload);
    },
    async () => {},
  );
  rpc.handle("projection", async () => {
    injected = true;
  });
  await rpc.receive({
    fromWindowLabel: "child",
    toWindowLabel: "owner",
    sessionId: "s",
    ownerEpoch: 1,
    requestId: "attack",
    payload: {
      kind: "request",
      method: "projection",
      args: { document: { draft: "overwritten" } },
    },
  });
  expect(injected).toBe(false);
  expect(replies).toHaveLength(1);
});
test("辅助surface只接受owner调用", async () => {
  let captured = false;
  const child = { ...bootstrap, windowLabel: "child", role: "editor" as const };
  const rpc = new EditorWindowRpc(
    child,
    async () => {},
    async () => {},
  );
  rpc.handle("provider", async () => {
    captured = true;
  });
  await rpc.receive({
    fromWindowLabel: "other-child",
    toWindowLabel: "child",
    sessionId: "s",
    ownerEpoch: 1,
    requestId: "attack",
    payload: { kind: "request", method: "provider", args: null },
  });
  expect(captured).toBe(false);
});

test("长期请求窗口不误拒绝新的递增请求，过期重放明确拒绝", async () => {
  let calls = 0;
  const sent: unknown[] = [];
  const rpc = new EditorWindowRpc(
    bootstrap,
    async (_target, _id, payload) => {
      sent.push(payload);
    },
    async () => {},
  );
  rpc.handle("change", async () => {
    calls++;
    return calls;
  });
  for (let sequence = 1; sequence <= 5000; sequence++)
    await rpc.receive({
      fromWindowLabel: "child",
      toWindowLabel: "owner",
      sessionId: "s",
      ownerEpoch: 1,
      requestId: `client:${sequence}`,
      payload: { kind: "request", method: "change", args: null },
    });
  expect(calls).toBe(5000);
  await rpc.receive({
    fromWindowLabel: "child",
    toWindowLabel: "owner",
    sessionId: "s",
    ownerEpoch: 1,
    requestId: "client:1",
    payload: { kind: "request", method: "change", args: null },
  });
  expect(calls).toBe(5000);
  expect(sent.at(-1)).toMatchObject({ kind: "response", ok: false });
});

test("ready提交通知只能在checkpoint被接收后发生", async () => {
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let ready = false;
  const rpc = new EditorWindowRpc(
    bootstrap,
    async () => {},
    () => gate,
  );
  rpc.handle("ready", async () => null);
  rpc.onCommitted(() => {
    ready = true;
  });
  const task = rpc.receive({
    fromWindowLabel: "child",
    toWindowLabel: "owner",
    sessionId: "s",
    ownerEpoch: 1,
    requestId: "ready:1",
    payload: { kind: "request", method: "ready", args: null },
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(ready).toBe(false);
  finish();
  await task;
  expect(ready).toBe(true);
});
