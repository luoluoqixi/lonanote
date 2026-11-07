import { expect, test } from "bun:test";

import { EditorWindowRpc } from "../src/components/editor/controllers/editor_window_rpc";
import {
  applyViewerProjection,
  handleViewerRequest,
  markViewerReadyCommitted,
  viewerProjection,
} from "../src/components/editor/controllers/editor_window_viewers";
import { createViewerTransfer } from "../src/components/editor/controllers/editor_window_viewers";
import { editorStore } from "../src/stores/editor/editor_store";

test("viewer 投影进入目标组并拒绝其他窗口请求", async () => {
  const state = editorStore.getState();
  const local = state.openViewer(
    { kind: "workspaceFile", workspaceId: "w", filePath: "photo.png" },
    "image",
  );
  const remote = editorStore.getState().attachRemoteViewer(local, "aux-a");
  const projection = viewerProjection(remote);
  expect(projection.viewer.groupId).toBeNull();
  const deps = { remoteViews: new Map([[remote, "aux-a"]]) };
  await expect(
    handleViewerRequest("viewer-duplicate", { editorId: remote }, "aux-b", deps),
  ).rejects.toThrow();
  applyViewerProjection(projection);
  expect(editorStore.getState().groupsById[editorStore.getState().activeGroupId].tabIds).toContain(
    remote,
  );
  expect(editorStore.getState().viewersById[remote].viewerKind).toBe("image");
  editorStore.getState().closeEditor(remote);
  editorStore.getState().closeEditor(local);
});

test("只读 viewer move 在 ready 与 checkpoint 后才关闭源标签", async () => {
  const local = editorStore
    .getState()
    .openViewer({ kind: "workspaceFile", workspaceId: "w", filePath: "note.pdf" }, "pdf");
  const remoteViews = new Map<string, string>();
  let remoteId = "";
  let committed = false;
  await createViewerTransfer(local, "move", {
    remoteViews,
    create: async (_id, payload) => {
      remoteId = (payload as any).viewer.viewerId;
      expect(editorStore.getState().viewersById[local]).toBeDefined();
      await handleViewerRequest("viewer-ready", { editorId: remoteId }, "aux-pdf", { remoteViews });
      markViewerReadyCommitted(remoteId);
      return { windowLabel: "aux-pdf" } as any;
    },
    checkpoint: async () => {
      expect(editorStore.getState().viewersById[local]).toBeDefined();
      committed = true;
    },
    show: async () => {
      expect(committed).toBe(true);
    },
  });
  expect(editorStore.getState().viewersById[local]).toBeUndefined();
  expect(editorStore.getState().viewersById[remoteId].groupId).toBeNull();
  editorStore.getState().closeEditor(remoteId);
});

test("viewer-ready checkpoint 失败保留源标签，重试提交后才移除", async () => {
  const local = editorStore
    .getState()
    .openViewer({ kind: "workspaceFile", workspaceId: "w", filePath: "retry.pdf" }, "pdf");
  const remoteViews = new Map<string, string>();
  let remoteId = "";
  let transferCheckpoints = 0;
  const transfer = createViewerTransfer(local, "move", {
    remoteViews,
    create: async (_id, payload) => {
      remoteId = (payload as any).viewer.viewerId;
      return { windowLabel: "aux-retry" } as any;
    },
    show: async () => {},
    checkpoint: async () => {
      transferCheckpoints++;
    },
  });
  let failCheckpoint = true;
  const replies: any[] = [];
  const rpc = new EditorWindowRpc(
    {
      windowLabel: "owner",
      role: "workbench",
      ownerWindowLabel: "owner",
      ownerEpoch: 1,
      sessionId: "session",
      checkpoint: null,
    },
    async (_target, _id, payload) => {
      replies.push(payload);
    },
    async () => {
      if (failCheckpoint) throw new Error("磁盘 checkpoint 失败");
    },
  );
  rpc.handle("viewer-ready", (args, from) =>
    handleViewerRequest("viewer-ready", args, from, { remoteViews }),
  );
  rpc.onCommitted((_method, args) =>
    markViewerReadyCommitted((args as { editorId: string }).editorId),
  );
  const readyMessage = (requestId: string) => ({
    fromWindowLabel: "aux-retry",
    toWindowLabel: "owner",
    sessionId: "session",
    ownerEpoch: 1,
    requestId,
    payload: { kind: "request", method: "viewer-ready", args: { editorId: remoteId } },
  });
  try {
    await rpc.receive(readyMessage("ready-failed"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(replies.at(-1).ok).toBe(false);
    expect(transferCheckpoints).toBe(0);
    expect(editorStore.getState().viewersById[local]).toBeDefined();
    failCheckpoint = false;
    await rpc.receive(readyMessage("ready-retry"));
    await transfer;
    expect(editorStore.getState().viewersById[local]).toBeUndefined();
    expect(transferCheckpoints).toBe(1);
  } finally {
    // 即使断言失败也释放等待，避免测试留下超时任务。
    markViewerReadyCommitted(remoteId);
    await transfer;
    rpc.dispose();
    editorStore.getState().closeEditor(remoteId);
    editorStore.getState().closeEditor(local);
  }
});
