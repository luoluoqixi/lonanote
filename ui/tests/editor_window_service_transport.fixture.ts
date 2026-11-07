import { expect, mock, test } from "bun:test";

import type { EditorWindowMessage } from "../src/api/commands/win/editor_windows";
import { EditorWindowRpc } from "../src/components/editor/controllers/editor_window_rpc";

const owner = {
  windowLabel: "owner",
  role: "workbench" as const,
  sessionId: "session",
  ownerWindowLabel: "owner",
  ownerEpoch: 1,
  checkpoint: null,
};
let receiveOwner!: (event: EditorWindowMessage) => void;
let receiveDestroyed!: (event: { payload: unknown }) => void;
let child: EditorWindowRpc;
let childLabel = "";
let listening = false;
let remoteId = "";
let draggedSource = "";
let draggedId = "";
let rejectAttach = false;
let reuseAttach: string | undefined;
const premature: string[] = [];
const sent: string[] = [];
const nativeCalls: unknown[] = [];
const closeTargets: string[][] = [];
mock.module("../src/components/editor/controllers/document_registry", () => ({
  documentRegistry: {
    ensureDocumentLoaded: async (id: string) => {
      const ref = editorStore.getState().documentsById[id].ref;
      if (ref.kind === "workspaceFile" && ref.filePath === "fail.md")
        throw new Error("模拟读取失败");
      editorStore.getState().setDocumentPersistedSnapshot(id, "文件内容");
    },
  },
}));
mock.module("../src/hooks/editor/use_editor_close_actions", () => ({
  prepareRemoteEditorWindowClose: async (_request: string, ids: string[]) => {
    closeTargets.push(ids);
    return true;
  },
}));
let releaseProjection: (() => void) | undefined;
let projectionEntered: (() => void) | undefined;
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 15));

mock.module("../src/api/common/platform", () => ({ isDesktop: () => true, isTauri: () => true }));
mock.module("../src/api/common", () => ({ detectWorkspaceFileKind: () => "text" }));
mock.module("../src/api/invoke", () => ({
  invoke: async () => {
    throw new Error("测试不允许文件 IO");
  },
}));
mock.module("@tauri-apps/api/core", () => ({
  invoke: async (command: string, args: unknown) => {
    nativeCalls.push([command, args]);
    return true;
  },
}));
mock.module("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({
    listen: async (_event: string, fn: typeof receiveDestroyed) => {
      receiveDestroyed = fn;
      return () => {};
    },
  }),
  WebviewWindow: { getByLabel: async () => ({}) },
}));
mock.module("../src/api/commands/win/editor_windows", () => ({
  editorWindows: {
    getBootstrap: async () => owner,
    listen: async (fn: typeof receiveOwner) => {
      receiveOwner = fn;
      return () => {};
    },
    checkpoint: async () => {},
    takeTabDrag: async () => [draggedSource, draggedId],
    create: async (_id: string, payload: any) => {
      remoteId = payload.editor.editorId;
      childLabel = `child-${globalThis.crypto.randomUUID()}`;
      const bootstrap = {
        ...owner,
        role: "editor" as const,
        windowLabel: childLabel,
        initialPayload: payload,
      };
      child = new EditorWindowRpc(
        bootstrap,
        async (to, requestId, message) => {
          receiveOwner({
            fromWindowLabel: childLabel,
            toWindowLabel: to,
            sessionId: owner.sessionId,
            ownerEpoch: 1,
            requestId,
            payload: message,
          });
        },
        async () => {},
      );
      child.handle("projection", async () => {
        if (projectionEntered) {
          projectionEntered();
          await new Promise<void>((resolve) => {
            releaseProjection = resolve;
          });
        }
        return null;
      });
      child.handle("provider", async () => ({ applied: true, revision: 0, text: "" }));
      child.handle("closed", async () => null);
      child.handle("attach", async (args: any) => {
        if (rejectAttach) throw new Error("目标标签组已关闭");
        if (reuseAttach) return reuseAttach;
        const id = args.value.editor.editorId;
        await child.request("owner", "ready", { editorId: id });
        return null;
      });
      return bootstrap;
    },
    show: async () => {},
    discard: async () => {},
    send: async (to: string, requestId: string, payload: any) => {
      sent.push(`${to}:${payload.kind}:${payload.method ?? "reply"}`);
      if (!listening) {
        premature.push(payload.method ?? payload.kind);
        return;
      }
      void child.receive({
        fromWindowLabel: "owner",
        toWindowLabel: to,
        sessionId: owner.sessionId,
        ownerEpoch: 1,
        requestId,
        payload,
      });
    },
  },
}));

const { editorStore } = await import("../src/stores/editor");
const { editorWindowService, transferEditorToNewWindow } =
  await import("../src/components/editor/controllers/editor_window_service");

for (const mode of ["copy", "move"] as const)
  test(`${mode}：握手前不发投影；成员销毁后取消尚未发送的投影`, async () => {
    listening = false;
    premature.length = 0;
    projectionEntered = undefined;
    await editorWindowService.initialize();
    const source = editorStore.getState().openEditor({ kind: "untitled" });
    const transfer = transferEditorToNewWindow(source.editorId, mode);
    await flush();
    expect(remoteId).not.toBe("");
    expect(premature).toEqual([]);
    listening = true;
    await child.request("owner", "ready", { editorId: remoteId });
    await transfer;
    await flush();
    expect(!!editorStore.getState().editorsById[source.editorId]).toBe(mode === "copy");
    const member = (await child.request("owner", "member-snapshot", {
      initialEditorId: "stale-from-checkpoint",
    })) as any;
    expect(member.projections.map((p: any) => p.editor.editorId)).toEqual([remoteId]);
    // 新 renderer 取得权威列表后重新握手，恢复投影订阅。
    await child.request("owner", "ready", { editorId: remoteId });
    expect(
      await child.request("owner", "prepare-close", {
        requestId: "refresh-close",
        editorIds: ["stale-from-checkpoint"],
      }),
    ).toBe(true);
    expect(closeTargets.at(-1)).toEqual([remoteId]);
    const entered = new Promise<void>((resolve) => {
      projectionEntered = resolve;
    });
    editorStore.getState().setEditorBridgeState(remoteId, "detached");
    await entered;
    editorStore.getState().setEditorBridgeState(remoteId, "ready");
    receiveDestroyed({
      payload: { windowLabel: childLabel, sessionId: owner.sessionId, ownerEpoch: 1 },
    });
    const before = sent.length;
    releaseProjection?.();
    await flush();
    expect(sent.length).toBe(before);
    expect(editorStore.getState().editorsById[remoteId].windowLabel).toBeUndefined();
    child.dispose();
  });

test("背景设置使用只作用于调用窗口的原生命令", async () => {
  const { win } = await import("../src/api/commands/win/win");
  expect(await win.setCurrentWindowBgColor("#121212")).toBe(true);
  expect(nativeCalls).toEqual([["set_current_window_background", { color: "#121212" }]]);
});

test("已有窗口之间双向移动标签时，保留共享文档并在目标就绪后删除来源", async () => {
  projectionEntered = undefined;
  listening = false;
  const source = editorStore.getState().openEditor({ kind: "untitled" });
  const transfer = transferEditorToNewWindow(source.editorId, "copy");
  await flush();
  listening = true;
  await child.request("owner", "ready", { editorId: remoteId });
  await transfer;
  draggedSource = childLabel;
  draggedId = remoteId;
  const group = editorStore.getState().activeGroupId;
  await editorWindowService.dropTab("to-owner", group);
  expect(editorStore.getState().editorsById[draggedId]).toBeUndefined();
  const returned = editorStore.getState().activeEditorId!;
  expect(returned).toBe(source.editorId);
  expect(editorStore.getState().editorsById[returned].documentId).toBe(source.documentId);
  draggedSource = "owner";
  draggedId = returned;
  rejectAttach = true;
  try {
    await expect(
      child.request("owner", "drop-tab", { token: "failed", groupId: "gone" }),
    ).rejects.toThrow("目标标签组已关闭");
    expect(editorStore.getState().openEditorIds).toContain(returned);
    expect(
      Object.values(editorStore.getState().editorsById).some(
        (view) => view.documentId === source.documentId && view.windowLabel === childLabel,
      ),
    ).toBe(false);
  } finally {
    rejectAttach = false;
  }
  await child.request("owner", "drop-tab", { token: "to-child", groupId: "remote-group" });
  expect(editorStore.getState().editorsById[returned]).toBeUndefined();
  expect(
    Object.values(editorStore.getState().editorsById).some(
      (view) => view.documentId === source.documentId && view.windowLabel === childLabel,
    ),
  ).toBe(true);
  receiveDestroyed({
    payload: { windowLabel: childLabel, sessionId: owner.sessionId, ownerEpoch: 1 },
  });
  child.dispose();
});

test("文件树拖放通过 owner 登记路径，辅助窗口重复打开在目标分组去重", async () => {
  const { workspaceSessionStore } = await import("../src/stores/workspace/workspace_session_store");
  workspaceSessionStore.setCurrentWorkspaceId("drag-workspace");
  projectionEntered = undefined;
  listening = false;
  const source = editorStore.getState().openEditor({ kind: "untitled" });
  const transfer = transferEditorToNewWindow(source.editorId, "copy");
  await flush();
  listening = true;
  await child.request("owner", "ready", { editorId: remoteId });
  await transfer;
  const active = editorStore.getState().activeEditorId;
  const token = editorWindowService.beginWorkspaceFileDrag("drag-workspace", ["a.md", "b.md"]);
  const values = (await child.request("owner", "drop-workspace-files", {
    token,
    groupId: "files",
  })) as any[];
  expect(values.map((p) => p.document.ref.filePath)).toEqual(["a.md", "b.md"]);
  expect(editorStore.getState().activeEditorId).toBe(active);
  const next = editorWindowService.beginWorkspaceFileDrag("drag-workspace", ["a.md"]);
  const again = (await child.request("owner", "drop-workspace-files", {
    token: next,
    groupId: "files",
  })) as any[];
  expect(again[0].editor.editorId).toBe(values[0].editor.editorId);
  const failed = editorWindowService.beginWorkspaceFileDrag("drag-workspace", [
    "new.md",
    "fail.md",
  ]);
  await expect(
    child.request("owner", "drop-workspace-files", { token: failed, groupId: "files" }),
  ).rejects.toThrow("模拟读取失败");
  expect(
    Object.values(editorStore.getState().editorsById)
      .filter((view) => view.windowLabel === childLabel)
      .map((view) => view.editorId)
      .sort(),
  ).toEqual([remoteId, ...values.map((p) => p.editor.editorId)].sort());
  await expect(
    child.request("owner", "drop-workspace-files", { token: next, groupId: "files" }),
  ).rejects.toThrow("文件拖放已失效");
  receiveDestroyed({
    payload: { windowLabel: childLabel, sessionId: owner.sessionId, ownerEpoch: 1 },
  });
  child.dispose();
  workspaceSessionStore.clearCurrentWorkspaceId();
});

test("跨窗口移动到已打开文档的目标组时复用已有标签，不遗留重复引用", async () => {
  projectionEntered = undefined;
  listening = false;
  const source = editorStore.getState().openEditor({ kind: "untitled" });
  const transfer = transferEditorToNewWindow(source.editorId, "copy");
  await flush();
  listening = true;
  await child.request("owner", "ready", { editorId: remoteId });
  await transfer;
  reuseAttach = remoteId;
  draggedSource = "owner";
  draggedId = source.editorId;
  try {
    await child.request("owner", "drop-tab", { token: "merge", groupId: "existing" });
    expect(editorStore.getState().editorsById[source.editorId]).toBeUndefined();
    expect(editorStore.getState().documentsById[source.documentId].attachedEditorIds).toEqual([
      remoteId,
    ]);
    const duplicate = (await child.request("owner", "duplicate", { editorId: remoteId })) as any;
    await child.request("owner", "ready", { editorId: duplicate.editor.editorId });
    await child.request("owner", "merge-view", {
      sourceId: duplicate.editor.editorId,
      targetId: remoteId,
    });
    expect(editorStore.getState().documentsById[source.documentId].attachedEditorIds).toEqual([
      remoteId,
    ]);
  } finally {
    reuseAttach = undefined;
    receiveDestroyed({
      payload: { windowLabel: childLabel, sessionId: owner.sessionId, ownerEpoch: 1 },
    });
    child.dispose();
  }
});
