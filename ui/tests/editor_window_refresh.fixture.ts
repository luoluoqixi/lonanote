import { expect, mock, test } from "bun:test";

import type { EditorWindowMessage } from "../src/api/commands/win/editor_windows";
import { EditorWindowRpc } from "../src/components/editor/controllers/editor_window_rpc";

mock.module("../src/api/common/platform", () => ({ isDesktop: () => true, isTauri: () => true }));
mock.module("../src/api/common", () => ({ detectWorkspaceFileKind: () => "text" }));
const { editorStore } = await import("../src/stores/editor");
const stale = editorStore.getState().openEditor({ kind: "untitled" }, { initialText: "旧快照" });
const staleProjection = {
  editor: editorStore.getState().editorsById[stale.editorId],
  document: editorStore.getState().documentsById[stale.documentId],
};
editorStore.getState().closeEditor(stale.editorId);
const actual = editorStore
  .getState()
  .openEditor({ kind: "untitled" }, { initialText: "owner 已确认的最新草稿" });
const current = {
  editor: editorStore.getState().editorsById[actual.editorId],
  document: editorStore.getState().documentsById[actual.documentId],
};
editorStore.getState().closeEditor(actual.editorId);
const ownerBootstrap = {
  windowLabel: "owner",
  ownerWindowLabel: "owner",
  role: "workbench" as const,
  sessionId: "session",
  ownerEpoch: 2,
  checkpoint: null,
};
let receive!: (event: EditorWindowMessage) => void;
const owner = new EditorWindowRpc(
  ownerBootstrap,
  async (to, requestId, payload) => {
    receive({
      fromWindowLabel: "owner",
      toWindowLabel: to,
      sessionId: "session",
      ownerEpoch: 2,
      requestId,
      payload,
    });
  },
  async () => {},
);
owner.handle("member-snapshot", async () => ({ projections: [current] }));
owner.handle("ready", async (args: any) => {
  if (args.editorId !== actual.editorId) throw new Error("该窗口不拥有编辑视图");
  return current;
});
owner.handle("prepare-close", async (args: any) => {
  expect(args.editorIds).toEqual([actual.editorId]);
  return true;
});
mock.module("../src/api/commands/win/editor_windows", () => ({
  editorWindows: {
    getBootstrap: async () => ({
      ...ownerBootstrap,
      windowLabel: "aux",
      role: "editor",
      initialPayload: staleProjection,
    }),
    listen: async (fn: typeof receive) => {
      receive = fn;
      return () => {};
    },
    send: async (to: string, requestId: string, payload: unknown) => {
      void owner.receive({
        fromWindowLabel: "aux",
        toWindowLabel: to,
        sessionId: "session",
        ownerEpoch: 2,
        requestId,
        payload,
      });
    },
  },
}));
const { editorWindowService, editorWindowState } =
  await import("../src/components/editor/controllers/editor_window_service");
test("丢弃已过期标签归属，恢复最新草稿并完成 ready 和关闭请求", async () => {
  await editorWindowService.initialize();
  expect(editorStore.getState().openEditorIds).toEqual([actual.editorId]);
  expect(editorStore.getState().documentsById[actual.documentId].draft).toBe(
    "owner 已确认的最新草稿",
  );
  await editorWindowService.markRemoteProviderReady(actual.editorId);
  expect(editorWindowState.getState().connected).toBe(true);
  expect(
    await editorWindowService.requestOwner("prepare-close", {
      editorIds: editorStore.getState().openEditorIds,
      requestId: "refresh",
    }),
  ).toBe(true);
});
