import { expect, mock, test } from "bun:test";

const leases = new Set<string>();
let pendingClaim: Promise<void> = Promise.resolve();
let failRead = false;
mock.module("@/api/common/platform", () => ({
  isDesktop: () => true,
  isTauri: () => false,
  isSystemLocaleCN: () => true,
}));
mock.module("@/api/commands/fs", () => ({ fs: {} }));
mock.module("@/api/commands/workspace", () => ({
  workspaceFile: {
    readText: async () => {
      if (failRead) throw new Error("读取失败");
      return "内容";
    },
    metadata: async () => ({ size: 2, modifiedAt: 1 }),
  },
}));
mock.module("@/api/commands/win/file_ownership", () => ({
  documentLeaseId: (document: { documentId: string; identityRevision: number }) =>
    `${document.documentId}:${document.identityRevision}`,
  claimDocumentFile: async (document: { documentId: string; identityRevision: number }) => {
    await pendingClaim;
    leases.add(`${document.documentId}:${document.identityRevision}`);
  },
  releaseDocumentFile: async (lease: string) => {
    leases.delete(lease);
  },
  releaseDocumentOwnership: async (document: string) => {
    for (const lease of leases) if (lease.startsWith(`${document}:`)) leases.delete(lease);
  },
}));
const { editorStore } = await import("../src/stores/editor");
const { documentRegistry } = await import("../src/components/editor/controllers/document_registry");
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("重命名先取得新 lease 再释放旧 lease，不出现可写占用空档", async () => {
  const { documentId } = documentRegistry.openEditor({
    kind: "workspaceFile",
    workspaceId: "ws",
    filePath: "old.md",
  });
  await documentRegistry.ensureDocumentLoaded(documentId);
  expect(leases.has(`${documentId}:0`)).toBe(true);
  let finish!: () => void;
  pendingClaim = new Promise<void>((resolve) => {
    finish = resolve;
  });
  editorStore.getState().renameWorkspacePath("ws", "old.md", "new.md");
  await tick();
  expect(leases.has(`${documentId}:0`)).toBe(true);
  finish();
  await tick();
  expect(leases.has(`${documentId}:1`)).toBe(true);
  expect(leases.has(`${documentId}:0`)).toBe(false);
  pendingClaim = Promise.resolve();
});

test("读取失败释放文件占用，其他窗口可以重试打开", async () => {
  failRead = true;
  const { documentId } = documentRegistry.openEditor({
    kind: "workspaceFile",
    workspaceId: "ws",
    filePath: "error.md",
  });
  await expect(documentRegistry.ensureDocumentLoaded(documentId)).rejects.toThrow("读取失败");
  expect(leases.has(`${documentId}:0`)).toBe(false);
  failRead = false;
});
