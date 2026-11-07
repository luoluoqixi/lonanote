import { expect, test } from "bun:test";

import { EditorBridgeClient } from "../src/components/editor/bridge/editor_bridge_client";

const identity = { channelId: "test", generation: 1, editorId: "e", documentId: "d" };
function event(name: string, payload: unknown, id: string) {
  return JSON.stringify({
    ...identity,
    protocolVersion: 1,
    messageId: id,
    kind: "event",
    event: name,
    payload,
  });
}
test("拒绝过期来源后冻结输入并保留未确认草稿", () => {
  const sent: string[] = [];
  const client = new EditorBridgeClient({
    identity,
    send: (s) => sent.push(s),
    onDocumentChanged: () => false,
    getInitializePayload: () => ({}) as never,
    onEditorReady: () => {},
    onEditorStateChanged: () => {},
    onEditorFocusChanged: () => {},
    onViewportScrollRequested: () => {},
    onSaveRequested: () => {},
    onResourceActivated: () => {},
    onTaskToggled: () => {},
    onConsole: () => {},
    onFatal: () => {},
  });
  client.handleSerializedMessage(event("editor.ready", {}, "ready"));
  client.handleSerializedMessage(
    event("document.changed", { baseRevision: 0, localSequence: 1, text: "未确认" }, "change"),
  );
  expect(client.getUnconfirmedDraft()).toBe("未确认");
  expect(JSON.parse(sent.at(-1)!).method).toBe("editor.setInputEnabled");
  client.dispose();
});
test("远端ACK较早修订不能覆盖来源后续未确认输入", () => {
  const sent: string[] = [];
  const client = new EditorBridgeClient({
    identity,
    send: (s) => sent.push(s),
    onDocumentChanged: () => "pending",
    getInitializePayload: () => ({}) as never,
    onEditorReady: () => {},
    onEditorStateChanged: () => {},
    onEditorFocusChanged: () => {},
    onViewportScrollRequested: () => {},
    onSaveRequested: () => {},
    onResourceActivated: () => {},
    onTaskToggled: () => {},
    onConsole: () => {},
    onFatal: () => {},
  });
  client.handleSerializedMessage(event("editor.ready", {}, "ready2"));
  client.handleSerializedMessage(
    event(
      "document.changed",
      { baseRevision: 0, localSequence: 1, change: { from: 0, to: 0, insert: "A" } },
      "c1",
    ),
  );
  client.handleSerializedMessage(
    event(
      "document.changed",
      { baseRevision: 1, localSequence: 2, change: { from: 1, to: 1, insert: "B" } },
      "c2",
    ),
  );
  client.syncDocumentRevision(1, "A");
  expect(sent.filter((s) => JSON.parse(s).method === "document.applyRevision")).toHaveLength(0);
  client.acknowledgeDocumentChange(1);
  client.syncDocumentRevision(1, "A");
  expect(client.getCurrentDraft()).toBe("AB");
  client.acknowledgeDocumentChange(2);
  client.syncDocumentRevision(2, "AB");
  expect(sent.filter((s) => JSON.parse(s).method === "document.applyRevision")).toHaveLength(0);
  client.dispose();
});
test("保留未确认草稿后拒绝checkpoint覆盖和重新启用输入", async () => {
  const client = new EditorBridgeClient({
    identity,
    send: () => {},
    onDocumentChanged: () => false,
    getInitializePayload: () => ({}) as never,
    onEditorReady: () => {},
    onEditorStateChanged: () => {},
    onEditorFocusChanged: () => {},
    onViewportScrollRequested: () => {},
    onSaveRequested: () => {},
    onResourceActivated: () => {},
    onTaskToggled: () => {},
    onConsole: () => {},
    onFatal: () => {},
  });
  client.handleSerializedMessage(event("editor.ready", {}, "ready3"));
  client.retainUnconfirmedDraft("草稿");
  await expect(client.applyDocumentRevision(1, "旧文本")).rejects.toThrow("未确认");
  await expect(client.setInputEnabled(true, "token", 1)).rejects.toThrow("未确认");
  expect(client.getUnconfirmedDraft()).toBe("草稿");
  client.dispose();
});
test("目标拒绝checkpoint且内容失配时不能默认为已同步", async () => {
  const client = new EditorBridgeClient({
    identity,
    send: (serialized) => {
      const request = JSON.parse(serialized);
      if (request.method === "document.applyRevision" || request.method === "document.capture")
        queueMicrotask(() =>
          client.handleSerializedMessage(
            JSON.stringify({
              ...identity,
              protocolVersion: 1,
              messageId: `response-${request.requestId}`,
              kind: "response",
              requestId: request.requestId,
              result:
                request.method === "document.capture"
                  ? { revision: 3, text: "过期来源" }
                  : { applied: false },
            }),
          ),
        );
    },
    onDocumentChanged: () => false,
    getInitializePayload: () => ({}) as never,
    onEditorReady: () => {},
    onEditorStateChanged: () => {},
    onEditorFocusChanged: () => {},
    onViewportScrollRequested: () => {},
    onSaveRequested: () => {},
    onResourceActivated: () => {},
    onTaskToggled: () => {},
    onConsole: () => {},
    onFatal: () => {},
  });
  client.handleSerializedMessage(event("editor.ready", {}, "ready4"));
  await expect(client.applyDocumentRevision(2, "权威文本")).rejects.toThrow("checkpoint");
  client.dispose();
});
