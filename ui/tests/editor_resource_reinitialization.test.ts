import { expect, test } from "bun:test";

import {
  EDITOR_BRIDGE_PROTOCOL_VERSION,
  type EditorInitializePayload,
} from "../assets/editor/src/bridge/protocol";
import {
  EditorBridgeClient,
  createEditorBridgeBootstrap,
} from "../src/components/editor/bridge/editor_bridge_client";

test("资源续租重建 bridge identity，ready 后发送新 scope 与草稿并恢复 capture", async () => {
  const initialIdentity = createEditorBridgeBootstrap("editor", "document", 1, 0);
  const renewedIdentity = createEditorBridgeBootstrap("editor", "document", 1, 1);
  expect(renewedIdentity.generation).toBeGreaterThan(initialIdentity.generation);
  expect(renewedIdentity.channelId).not.toBe(initialIdentity.channelId);
  expect(renewedIdentity.editorId).toBe(initialIdentity.editorId);
  expect(renewedIdentity.documentId).toBe(initialIdentity.documentId);
  const sent: Array<{ method: string; payload: EditorInitializePayload }> = [];
  let readyCount = 0;
  let sequence = 0;
  const makeClient = (identity: typeof initialIdentity, scopeId: string) => {
    const payload = {
      runtime: { revision: 1 },
      preferences: { lineNumbers: true, lineWrapping: true, sourceMode: false },
      document: { text: "保留的未保存草稿", revision: 7 },
      resources: {
        available: true,
        scopeId,
        generation: 1,
        endpoint: `resource://${scopeId}/`,
        documentPath: "note.md",
      },
    } as EditorInitializePayload;
    const client = new EditorBridgeClient({
      identity,
      getInitializePayload: () => payload,
      send: (serialized) => {
        const message = JSON.parse(serialized);
        sent.push(message);
        if (message.method === "document.capture")
          queueMicrotask(() =>
            client.handleSerializedMessage(
              JSON.stringify({
                ...identity,
                protocolVersion: EDITOR_BRIDGE_PROTOCOL_VERSION,
                messageId: `response-${++sequence}`,
                kind: "response",
                requestId: message.requestId,
                result: { revision: 7, text: "保留的未保存草稿" },
              }),
            ),
          );
      },
      onEditorReady: () => {
        readyCount++;
      },
      onDocumentChanged: () => true,
      onEditorStateChanged: () => {},
      onEditorFocusChanged: () => {},
      onViewportScrollRequested: () => {},
      onSaveRequested: () => {},
      onResourceActivated: () => {},
      onTaskToggled: () => {},
      onConsole: () => {},
      onFatal: (error) => {
        throw new Error(error);
      },
    });
    const event = (name: string) =>
      client.handleSerializedMessage(
        JSON.stringify({
          ...identity,
          protocolVersion: EDITOR_BRIDGE_PROTOCOL_VERSION,
          messageId: `event-${++sequence}`,
          kind: "event",
          event: name,
          payload: {},
        }),
      );
    return { client, event };
  };
  const initial = makeClient(initialIdentity, "revoked");
  initial.event("bridge.ready");
  initial.event("editor.ready");
  initial.client.dispose();
  const renewed = makeClient(renewedIdentity, "renewed");
  renewed.event("bridge.ready");
  expect(
    sent.filter((message) => message.method === "host.initialize").at(-1)?.payload.resources,
  ).toMatchObject({ scopeId: "renewed" });
  expect(
    sent.filter((message) => message.method === "host.initialize").at(-1)?.payload.document.text,
  ).toBe("保留的未保存草稿");
  renewed.event("editor.ready");
  expect(readyCount).toBe(2);
  expect(await renewed.client.captureDocument()).toEqual({ revision: 7, text: "保留的未保存草稿" });
  renewed.client.dispose();
});
