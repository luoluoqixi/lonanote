import { expect, test } from "bun:test";

import { createWorkspaceTransferActions } from "../src/hooks/workspace/workspace_transfer_actions";
import { editorStore, isDocumentDirty } from "../src/stores/editor";

test("复制不保存保留源草稿，移动仅重绑定成功项", async () => {
  const one = editorStore
    .getState()
    .openEditor({ kind: "workspaceFile", workspaceId: "transfer", filePath: "one.md" });
  const two = editorStore
    .getState()
    .openEditor({ kind: "workspaceFile", workspaceId: "transfer", filePath: "two.md" });
  editorStore.getState().setDocumentDraft(one.documentId, "one draft");
  editorStore.getState().setDocumentDraft(two.documentId, "two draft");
  const actions = createWorkspaceTransferActions({
    workspaceFile: {
      exists: async () => false,
      transfer: async (_id, sources, dest) =>
        sources.map((s, index) => ({
          sourcePath: s.path,
          targetPath: index === 0 ? `${dest}/${s.path}` : null,
          status: index === 0 ? "succeeded" : "failed",
          error: index ? "失败" : null,
        })),
    },
    saveCoordinator: {
      withDocumentMutation: async (_ids, operation) =>
        operation({ capture: async () => {}, save: async () => "saved" }),
    },
    currentWorkspaceId: () => "transfer",
    confirmDirty: async () => "discard",
    confirmConflict: async () => "keepBoth",
    invalidatePaths: async () => {},
  });
  const sources = [{ path: "one.md" }, { path: "two.md" }];
  await actions.transferEntries({
    workspaceId: "transfer",
    sources,
    destinationDirectory: "copies",
    operation: "copy",
  });
  expect(isDocumentDirty(editorStore.getState().documentsById[one.documentId])).toBe(true);
  const result = await actions.transferEntries({
    workspaceId: "transfer",
    sources,
    destinationDirectory: "moved",
    operation: "move",
  });
  expect(result.entries[1].status).toBe("failed");
  expect(editorStore.getState().documentsById[one.documentId].ref).toMatchObject({
    filePath: "moved/one.md",
  });
  expect(editorStore.getState().documentsById[one.documentId].draft).toBe("");
  expect(editorStore.getState().documentsById[two.documentId].ref).toMatchObject({
    filePath: "two.md",
  });
  expect(editorStore.getState().documentsById[two.documentId].draft).toBe("two draft");
  for (const doc of [one, two]) {
    editorStore.getState().discardDocumentDraft(doc.documentId);
    editorStore.getState().closeEditor(doc.editorId);
  }
});

test("保存 dirty 来源后仍保留剪贴板身份复验", async () => {
  const doc = editorStore
    .getState()
    .openEditor({ kind: "workspaceFile", workspaceId: "identity", filePath: "source.md" });
  editorStore.getState().setDocumentDraft(doc.documentId, "dirty");
  const sources = [
    {
      path: "source.md",
      expectedMetadata: {
        kind: "file" as const,
        size: 1,
        createdAt: null,
        modifiedAt: 1,
        identity: "stable-id",
      },
    },
  ];
  let received: unknown;
  const actions = createWorkspaceTransferActions({
    workspaceFile: {
      exists: async () => false,
      transfer: async (_id, items) => {
        received = items;
        return [];
      },
    },
    saveCoordinator: {
      withDocumentMutation: async (_ids, run) =>
        run({ capture: async () => {}, save: async () => "saved" }),
    },
    currentWorkspaceId: () => "identity",
    confirmDirty: async () => "save",
    confirmConflict: async () => "skip",
    invalidatePaths: async () => {},
  });
  await actions.transferEntries({
    workspaceId: "identity",
    sources,
    destinationDirectory: "dest",
    operation: "copy",
  });
  expect(received).toEqual(sources);
  editorStore.getState().discardDocumentDraft(doc.documentId);
  editorStore.getState().closeEditor(doc.editorId);
});

test("覆盖策略透传 Core，并保护已打开的目标路径", async () => {
  const target = editorStore
    .getState()
    .openEditor({ kind: "workspaceFile", workspaceId: "overwrite", filePath: "dest/source.md" });
  let received: unknown[] = [];
  const actions = createWorkspaceTransferActions({
    workspaceFile: {
      exists: async () => true,
      transfer: async (...args) => {
        received = args;
        return [];
      },
    },
    saveCoordinator: {
      withDocumentMutation: async (_ids, run) =>
        run({ capture: async () => {}, save: async () => "saved" }),
    },
    currentWorkspaceId: () => "overwrite",
    confirmDirty: async () => "discard",
    confirmConflict: async () => "overwrite",
    invalidatePaths: async () => {},
  });
  await actions.transferEntries({
    workspaceId: "overwrite",
    sources: [{ path: "source.md" }],
    destinationDirectory: "dest",
    operation: "copy",
  });
  expect(received[4]).toBe("overwrite");
  expect(received[5]).toContain("dest/source.md");
  editorStore.getState().closeEditor(target.editorId);
});

for (const operation of ["move", "copy"] as const) {
  test(`同目录 ${operation} 不询问重名且保留原标签和草稿`, async () => {
    const doc = editorStore
      .getState()
      .openEditor({ kind: "workspaceFile", workspaceId: "duplicate", filePath: "notes/source.md" });
    editorStore.getState().setDocumentDraft(doc.documentId, "draft");
    let conflicts = 0;
    const actions = createWorkspaceTransferActions({
      workspaceFile: {
        exists: async () => true,
        transfer: async () => [
          {
            sourcePath: "notes/source.md",
            targetPath: "notes/source (1).md",
            status: "succeeded",
            error: null,
          },
        ],
      },
      saveCoordinator: {
        withDocumentMutation: async (_ids, run) =>
          run({ capture: async () => {}, save: async () => "saved" }),
      },
      currentWorkspaceId: () => "duplicate",
      confirmDirty: async () => "discard",
      confirmConflict: async () => {
        conflicts++;
        return "keepBoth";
      },
      invalidatePaths: async () => {},
    });
    try {
      const result = await actions.transferEntries({
        workspaceId: "duplicate",
        sources: [{ path: "notes/source.md" }],
        destinationDirectory: "notes",
        operation,
      });
      expect(conflicts).toBe(0);
      expect(result.entries[0].status).toBe("succeeded");
      expect(editorStore.getState().documentsById[doc.documentId].ref).toMatchObject({
        filePath: "notes/source.md",
      });
      expect(editorStore.getState().documentsById[doc.documentId].draft).toBe("draft");
    } finally {
      editorStore.getState().discardDocumentDraft(doc.documentId);
      editorStore.getState().closeEditor(doc.editorId);
    }
  });
}
