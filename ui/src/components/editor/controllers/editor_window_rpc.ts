import type { EditorWindowBootstrap, EditorWindowMessage } from "@/api/commands/win/editor_windows";

type Handler = (args: unknown, fromWindowLabel: string) => Promise<unknown>;
type Reply =
  | { kind: "response"; ok: true; result: unknown }
  | { kind: "response"; ok: false; error: string };
type Pending = {
  target: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> | undefined;
};

export class EditorWindowReloadedError extends Error {
  constructor() {
    super("目标编辑器已重新加载");
  }
}

/** Rust 负责成员认证；此层负责代次、请求去重及持久确认顺序。 */
export class EditorWindowRpc {
  private handlers = new Map<string, Handler>();
  private completed = new Map<string, Promise<unknown>>();
  // 自动请求 ID 由 client nonce 和递增序号组成；淘汰后的旧序号拒绝重放。
  private retiredFloor = new Map<string, number>();
  private nonce = globalThis.crypto.randomUUID();
  private sequence = 0;
  private pending = new Map<string, Pending>();
  private disconnectedTargets = new Set<string>();
  private disposed = false;
  private commitListener: ((method: string, args: unknown, from: string) => void) | undefined;
  constructor(
    readonly bootstrap: EditorWindowBootstrap,
    private send: (target: string, requestId: string, payload: unknown) => Promise<void>,
    private checkpoint: () => Promise<void>,
    private timeoutMs = 15000,
  ) {}
  handle(method: string, handler: Handler) {
    this.handlers.set(method, handler);
    return () => {
      if (this.handlers.get(method) === handler) this.handlers.delete(method);
    };
  }
  onCommitted(listener: (method: string, args: unknown, from: string) => void) {
    this.commitListener = listener;
  }
  request(
    target: string,
    method: string,
    args: unknown,
    requestId = `${this.nonce}:${++this.sequence}`,
    timeoutMs: number | null = this.timeoutMs,
  ): Promise<unknown> {
    if (this.disposed) return Promise.reject(new Error("编辑器会话已断开"));
    if (this.disconnectedTargets.has(target))
      return Promise.reject(new Error("目标编辑器窗口已关闭"));
    if (this.pending.has(requestId)) return Promise.reject(new Error("请求仍在等待响应"));
    return new Promise((resolve, reject) => {
      const timer =
        timeoutMs === null
          ? undefined
          : setTimeout(() => {
              this.pending.delete(requestId);
              reject(new Error("编辑器窗口未响应，已暂停本次操作"));
            }, timeoutMs);
      this.pending.set(requestId, { target, resolve, reject, timer });
      void this.send(target, requestId, { kind: "request", method, args }).catch((error) => {
        const entry = this.pending.get(requestId);
        if (!entry) return;
        clearTimeout(entry.timer);
        this.pending.delete(requestId);
        reject(error);
      });
    });
  }
  async receive(event: EditorWindowMessage): Promise<void> {
    const b = this.bootstrap;
    if (
      this.disposed ||
      this.disconnectedTargets.has(event.fromWindowLabel) ||
      event.toWindowLabel !== b.windowLabel ||
      event.sessionId !== b.sessionId ||
      event.ownerEpoch !== b.ownerEpoch
    )
      return;
    const payload = event.payload as {
      kind?: string;
      method?: string;
      args?: unknown;
      ok?: boolean;
      result?: unknown;
      error?: string;
    } | null;
    if (!payload || typeof payload !== "object") return;
    if (payload.kind === "response") {
      const entry = this.pending.get(event.requestId);
      if (!entry || entry.target !== event.fromWindowLabel) return;
      clearTimeout(entry.timer);
      this.pending.delete(event.requestId);
      if (payload.ok) entry.resolve(payload.result);
      else entry.reject(new Error(payload.error ?? "远端操作失败"));
      return;
    }
    if (payload.kind !== "request" || typeof payload.method !== "string") return;
    const receiverMethods = ["projection", "provider", "closed", "attach"];
    const permitted =
      b.role === "editor"
        ? receiverMethods.includes(payload.method) && event.fromWindowLabel === b.ownerWindowLabel
        : !receiverMethods.includes(payload.method);
    if (!permitted) {
      await this.reply(event.fromWindowLabel, event.requestId, {
        kind: "response",
        ok: false,
        error: "窗口角色不允许该操作",
      });
      return;
    }
    const key = JSON.stringify([event.fromWindowLabel, event.requestId]);
    let task = this.completed.get(key);
    if (!task) {
      const requestSequence = /^(.+):(\d+)$/.exec(event.requestId);
      const client = requestSequence
        ? JSON.stringify([event.fromWindowLabel, requestSequence[1]])
        : null;
      if (client && !this.retiredFloor.has(client)) {
        if (this.retiredFloor.size >= 128) {
          await this.reply(event.fromWindowLabel, event.requestId, {
            kind: "response",
            ok: false,
            error: "客户端重连次数过多，请刷新原窗口",
          });
          return;
        }
        this.retiredFloor.set(client, 0);
      }
      const expired = client
        ? Number(requestSequence![2]) <= (this.retiredFloor.get(client) ?? 0)
        : this.completed.size >= 2048;
      if (expired) {
        await this.reply(event.fromWindowLabel, event.requestId, {
          kind: "response",
          ok: false,
          error: "请求去重窗口已过期，请重新连接",
        });
        return;
      }
      const handler = this.handlers.get(payload.method);
      task = handler
        ? Promise.resolve().then(() => handler(payload.args, event.fromWindowLabel))
        : Promise.reject(new Error("不支持的编辑器操作"));
      this.completed.set(key, task);
      if (this.completed.size > 2048) {
        const oldest = this.completed.keys().next().value;
        if (oldest) {
          this.completed.delete(oldest);
          const [sender, id] = JSON.parse(oldest) as [string, string];
          const match = /^(.+):(\d+)$/.exec(id);
          if (match) {
            const clientKey = JSON.stringify([sender, match[1]]);
            this.retiredFloor.set(
              clientKey,
              Math.max(this.retiredFloor.get(clientKey) ?? 0, Number(match[2])),
            );
          }
        }
      }
    }
    let reply: Reply;
    try {
      const result = await task;
      // checkpoint 失败时保留已执行结果，重发仅重试 checkpoint，不重复变更。
      await this.checkpoint();
      if (!this.disposed && !this.disconnectedTargets.has(event.fromWindowLabel))
        this.commitListener?.(payload.method, payload.args, event.fromWindowLabel);
      reply = { kind: "response", ok: true, result };
    } catch (error) {
      reply = {
        kind: "response",
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    // handler/checkpoint 期间 native 成员可能已销毁，迟到回复不能再触发路由校验。
    if (!this.disposed && !this.disconnectedTargets.has(event.fromWindowLabel))
      await this.reply(event.fromWindowLabel, event.requestId, reply);
  }
  private async reply(target: string, requestId: string, payload: Reply) {
    try {
      await this.send(target, requestId, payload);
    } catch (error) {
      // Rust 已移除成员时，Destroyed 通知可能尚未到达 renderer。
      // 仅结束发往已关闭窗口的迟到回复；认证及跨会话错误继续上报。
      if ((error instanceof Error ? error.message : String(error)) !== "目标编辑器窗口已关闭")
        throw error;
      this.disconnectTarget(target);
    }
  }
  disconnectTarget(target: string) {
    this.disconnectedTargets.add(target);
    for (const [id, entry] of this.pending) {
      if (entry.target !== target) continue;
      clearTimeout(entry.timer);
      this.pending.delete(id);
      entry.reject(new Error("目标编辑器窗口已关闭"));
    }
  }
  resetTarget(target: string) {
    for (const [id, entry] of this.pending) {
      if (entry.target !== target) continue;
      clearTimeout(entry.timer);
      this.pending.delete(id);
      entry.reject(new EditorWindowReloadedError());
    }
  }
  dispose() {
    this.disposed = true;
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(new Error("编辑器会话已断开"));
    }
    this.pending.clear();
    this.handlers.clear();
    this.completed.clear();
    this.retiredFloor.clear();
    this.disconnectedTargets.clear();
  }
}
