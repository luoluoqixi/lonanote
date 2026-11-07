import { expect, test } from "bun:test";

import { editorInputLeaseCoordinator } from "../src/components/editor/controllers/editor_input_lease_coordinator";
import { editorStore } from "../src/stores/editor";

test("快速切换分屏时已过时的输入申请不再启用旧视图", async () => {
  const first = editorStore.getState().openEditor({ kind: "untitled" });
  const second = editorStore
    .getState()
    .duplicateEditor(first.editorId, editorStore.getState().activeGroupId);
  editorStore.getState().setActiveEditor(null);
  for (const id of [first.editorId, second])
    editorStore.getState().setEditorBridgeState(id, "ready");
  let continueApply!: () => void;
  let entered!: () => void;
  const waiting = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const released = new Promise<void>((resolve) => {
    continueApply = resolve;
  });
  const enabled: string[] = [];
  const disposers = [first.editorId, second].map((id) =>
    editorInputLeaseCoordinator.registerProvider(id, {
      captureDocument: async () => ({ revision: 0, text: "" }),
      blur: async () => {},
      applyDocumentRevision: async () => {
        if (id === first.editorId) {
          entered();
          await released;
        }
        return { applied: true };
      },
      setInputEnabled: async (value) => {
        if (value) enabled.push(id);
        return { applied: true };
      },
    }),
  );
  try {
    const old = editorInputLeaseCoordinator.requestLease(first.editorId);
    await waiting;
    const latest = editorInputLeaseCoordinator.requestLease(second);
    continueApply();
    await Promise.all([old, latest]);
    expect(enabled).toEqual([second]);
    expect(editorStore.getState().documentsById[first.documentId].editOwnerEditorId).toBe(second);
  } finally {
    disposers.forEach((dispose) => dispose());
  }
});

test("IME未结束时不移交输入权且保留草稿", async () => {
  const state = editorStore.getState();
  const first = state.openEditor({ kind: "untitled" });
  const second = {
    editorId: editorStore
      .getState()
      .duplicateEditor(first.editorId, editorStore.getState().activeGroupId),
  };
  editorStore.getState().setEditorBridgeState(first.editorId, "ready");
  editorStore.getState().setEditorBridgeState(second.editorId, "ready");
  editorStore.getState().setDocumentEditOwner(first.documentId, first.editorId);
  editorStore.getState().setActiveEditor(null);
  const cleanup = editorInputLeaseCoordinator.registerProvider(first.editorId, {
    captureDocument: async () => ({ revision: 0, text: "输入中", composing: true }),
    applyDocumentRevision: async () => ({ applied: true }),
    blur: async () => {},
    setInputEnabled: async () => ({ applied: false }),
  });
  const cleanup2 = editorInputLeaseCoordinator.registerProvider(second.editorId, {
    captureDocument: async () => ({ revision: 0, text: "" }),
    applyDocumentRevision: async () => ({ applied: true }),
    blur: async () => {},
    setInputEnabled: async () => ({ applied: true }),
  });
  await expect(editorInputLeaseCoordinator.requestLease(second.editorId)).rejects.toThrow();
  expect(editorStore.getState().documentsById[first.documentId]?.editOwnerEditorId).toBe(
    first.editorId,
  );
  cleanup();
  cleanup2();
});

test("冻结未确认时release保留原持有者", async () => {
  const first = editorStore.getState().openEditor({ kind: "untitled" });
  editorStore.getState().setEditorBridgeState(first.editorId, "ready");
  editorStore.getState().setDocumentEditOwner(first.documentId, first.editorId);
  editorStore.getState().setActiveEditor(null);
  editorStore.getState().setActiveEditor(null);
  const cleanup = editorInputLeaseCoordinator.registerProvider(first.editorId, {
    captureDocument: async () => ({ revision: 0, text: "" }),
    applyDocumentRevision: async () => ({ applied: true }),
    blur: async () => {},
    setInputEnabled: async () => ({ applied: false }),
  });
  await expect(editorInputLeaseCoordinator.releaseLease(first.editorId)).rejects.toThrow();
  expect(editorStore.getState().documentsById[first.documentId]?.editOwnerEditorId).toBe(
    first.editorId,
  );
  cleanup();
});
test("屏障撤销恢复每个文档原持有者而不依赖活动标签", async () => {
  const first = editorStore.getState().openEditor({ kind: "untitled" });
  editorStore.getState().setEditorBridgeState(first.editorId, "ready");
  editorStore.getState().setDocumentEditOwner(first.documentId, first.editorId);
  editorStore.getState().setActiveEditor(null);
  let enabled = true;
  const dispose = editorInputLeaseCoordinator.registerProvider(first.editorId, {
    captureDocument: async () => ({ revision: 0, text: "" }),
    applyDocumentRevision: async () => ({ applied: true }),
    blur: async () => {},
    setInputEnabled: async (value) => {
      enabled = value;
      return { applied: true };
    },
  });
  const resume = await editorInputLeaseCoordinator.suspendDocuments([first.documentId]);
  expect(enabled).toBe(false);
  await resume();
  expect(enabled).toBe(true);
  dispose();
});

test("屏障恢复不把远端或另一分屏的输入权转交给本窗口活动标签", async () => {
  const first = editorStore.getState().openEditor({ kind: "untitled" });
  const other = editorStore
    .getState()
    .duplicateEditor(first.editorId, editorStore.getState().activeGroupId);
  editorStore.getState().setActiveEditor(null);
  const disposers = [first.editorId, other].map((id) => {
    editorStore.getState().setEditorBridgeState(id, "ready");
    return editorInputLeaseCoordinator.registerProvider(id, {
      captureDocument: async () => ({ revision: 0, text: "" }),
      blur: async () => {},
      applyDocumentRevision: async () => ({ applied: true }),
      setInputEnabled: async () => ({ applied: true }),
    });
  });
  try {
    editorStore.getState().setDocumentEditOwner(first.documentId, first.editorId);
    editorStore.getState().setActiveEditor(other);
    const resume = await editorInputLeaseCoordinator.suspendDocuments([first.documentId]);
    await resume();
    expect(editorStore.getState().documentsById[first.documentId].editOwnerEditorId).toBe(
      first.editorId,
    );
  } finally {
    disposers.forEach((dispose) => dispose());
  }
});
test("不可达持有者release失败而不撤销其草稿归属", async () => {
  const first = editorStore.getState().openEditor({ kind: "untitled" });
  editorStore.getState().setDocumentEditOwner(first.documentId, first.editorId);
  await expect(editorInputLeaseCoordinator.releaseLease(first.editorId)).rejects.toThrow();
  expect(editorStore.getState().documentsById[first.documentId]?.editOwnerEditorId).toBe(
    first.editorId,
  );
});
