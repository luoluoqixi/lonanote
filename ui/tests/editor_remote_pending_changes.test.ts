import { expect, test } from "bun:test";

import { EditorBridgeClient } from "../src/components/editor/bridge/editor_bridge_client";

const identity = { channelId: "remote", generation: 1, editorId: "remote-editor", documentId: "d" };
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

function probe() {
  const sent: string[] = [];
  const client = new EditorBridgeClient({
    identity,
    send: (message) => sent.push(message),
    onDocumentChanged: () => "pending",
    getInitializePayload: () => ({}) as never,
    onEditorReady() {},
    onEditorStateChanged() {},
    onEditorFocusChanged() {},
    onViewportScrollRequested() {},
    onSaveRequested() {},
    onResourceActivated() {},
    onTaskToggled() {},
    onConsole() {},
    onFatal() {},
  });
  client.handleSerializedMessage(event("editor.ready", {}, "ready"));
  return { client, sent };
}

test("连续远端输入未ACK时，较旧owner投影不得覆盖最新草稿", () => {
  const { client, sent } = probe();
  try {
    client.handleSerializedMessage(
      event("document.changed", { baseRevision: 0, localSequence: 1, text: "A" }, "first"),
    );
    client.handleSerializedMessage(
      event("document.changed", { baseRevision: 1, localSequence: 2, text: "AB" }, "second"),
    );
    expect(client.getCurrentDraft()).toBe("AB");
    client.syncDocumentRevision(1, "A");
    expect(client.getCurrentDraft()).toBe("AB");
    expect(
      sent
        .map((message) => JSON.parse(message))
        .filter((message) => message.method === "document.applyRevision"),
    ).toHaveLength(0);
  } finally {
    client.dispose();
  }
});

test("ACK确认最新输入后，晚到的较旧确认不能回退文档", () => {
  const { client } = probe();
  try {
    client.handleSerializedMessage(
      event("document.changed", { baseRevision: 0, localSequence: 1, text: "A" }, "first"),
    );
    client.handleSerializedMessage(
      event("document.changed", { baseRevision: 1, localSequence: 2, text: "AB" }, "second"),
    );
    client.acknowledgeDocumentChange(2);
    client.acknowledgeDocumentChange(1);
    client.syncDocumentRevision(1, "A");
    expect(client.getCurrentDraft()).toBe("AB");
  } finally {
    client.dispose();
  }
});

test("ACK失败保留最新草稿，即使收到后续确认也拒绝旧投影和重新启用输入", async () => {
  const { client } = probe();
  try {
    client.handleSerializedMessage(
      event("document.changed", { baseRevision: 0, localSequence: 1, text: "A" }, "first"),
    );
    client.handleSerializedMessage(
      event("document.changed", { baseRevision: 1, localSequence: 2, text: "AB" }, "second"),
    );
    // 对应真实远端回调：较早请求失败时保留当前完整文本，而不是该请求旧payload。
    client.retainUnconfirmedDraft(client.getCurrentDraft());
    client.acknowledgeDocumentChange(2);
    client.syncDocumentRevision(1, "A");
    expect(client.getUnconfirmedDraft()).toBe("AB");
    expect(client.getCurrentDraft()).toBe("AB");
    await expect(client.applyDocumentRevision(1, "A")).rejects.toThrow("未确认草稿");
    await expect(client.setInputEnabled(true, "new-lease", 1)).rejects.toThrow("未确认草稿");
    expect(client.getCurrentDraft()).toBe("AB");
  } finally {
    client.dispose();
  }
});
