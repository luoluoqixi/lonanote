import { beforeEach, expect, test } from "bun:test";

import { createWorkspaceFileActions } from "../src/hooks/workspace/workspace_file_actions";
import { editorStore } from "../src/stores/editor/editor_store";

beforeEach(() =>
  editorStore.setState({
    documentIds: [],
    documentsById: {},
    documentIdByKey: {},
    editorsById: {},
    openEditorIds: [],
    activeEditorId: null,
  }),
);
function fixture() {
  const disk = new Map<string, string>([
    ["old/a.md", "a"],
    ["oldish/a.md", "b"],
    ["failed.md", "c"],
  ]);
  let decision: "save" | "discard" | "cancel" = "discard";
  let refreshFails = false;
  let saveFails = false;
  const actions = createWorkspaceFileActions({
    workspaceFile: {
      exists: async (_, p) => disk.has(p),
      writeText: async (_, p, text) => {
        disk.set(p, text);
      },
      createDirectory: async (_, p) => {
        disk.set(p, "");
      },
      rename: async (_, from, to) => {
        for (const [p, text] of [...disk])
          if (p === from || p.startsWith(from + "/")) {
            disk.delete(p);
            disk.set(to + p.slice(from.length), text);
          }
      },
      remove: async (_, p) => {
        if (p === "failed.md") throw new Error("readonly");
        for (const key of disk.keys()) if (key === p || key.startsWith(p + "/")) disk.delete(key);
      },
    },
    explorer: {
      invalidatePaths: async () => {
        if (refreshFails) throw new Error("refresh offline");
      },
    },
    saveCoordinator: {
      withDocumentMutation: async (_ids, operation) =>
        operation({
          capture: async () => {},
          save: async () => {
            if (saveFails) throw new Error("save failed");
          },
        }),
    },
    confirmDirty: async () => decision,
  });
  return {
    actions,
    disk,
    setDecision: (d: typeof decision) => {
      decision = d;
    },
    failRefresh: () => {
      refreshFails = true;
    },
    failSave: () => {
      saveFails = true;
    },
  };
}
function document(path: string, workspaceId = "w") {
  const result = editorStore
    .getState()
    .openEditor({ kind: "workspaceFile", workspaceId, filePath: path });
  editorStore.getState().setDocumentLoadState(result.documentId, "ready");
  editorStore.getState().setDocumentDraft(result.documentId, "dirty");
  return result;
}
test("目录改名保持文档和 view 身份，路径边界与其它 workspace 隔离", async () => {
  const { actions, disk } = fixture();
  const a = document("old/a.md");
  const b = document("oldish/a.md");
  const c = document("old/a.md", "other");
  const result = await actions.renameEntry({ workspaceId: "w", path: "old", nextPath: "new" });
  expect(result.succeededPaths).toEqual(["old"]);
  expect(disk.get("new/a.md")).toBe("a");
  expect(editorStore.getState().editorsById[a.editorId].documentId).toBe(a.documentId);
  expect(editorStore.getState().documentsById[a.documentId].ref).toEqual({
    kind: "workspaceFile",
    workspaceId: "w",
    filePath: "new/a.md",
  });
  expect(editorStore.getState().documentsById[b.documentId].ref).toEqual({
    kind: "workspaceFile",
    workspaceId: "w",
    filePath: "oldish/a.md",
  });
  expect(editorStore.getState().documentsById[c.documentId].ref).toEqual({
    kind: "workspaceFile",
    workspaceId: "other",
    filePath: "old/a.md",
  });
});
test("目标身份冲突在 Storage mutation 前拒绝，取消与保存失败不执行 mutation", async () => {
  const f = fixture();
  document("old/a.md");
  document("new/a.md");
  const conflict = await f.actions.renameEntry({ workspaceId: "w", path: "old", nextPath: "new" });
  expect(conflict.failedPaths.length).toBe(1);
  expect(f.disk.has("old/a.md")).toBe(true);
  f.setDecision("cancel");
  expect((await f.actions.deleteEntries({ workspaceId: "w", paths: ["old"] })).cancelled).toBe(
    true,
  );
  f.setDecision("save");
  f.failSave();
  expect(
    (await f.actions.deleteEntries({ workspaceId: "w", paths: ["old"] })).failedPaths.length,
  ).toBe(1);
});
test("批量父子去重，部分失败仅删除成功文档；刷新失败仍报告操作成功", async () => {
  const f = fixture();
  const a = document("old/a.md");
  const b = document("failed.md");
  f.failRefresh();
  const result = await f.actions.deleteEntries({
    workspaceId: "w",
    paths: ["old/a.md", "old", "failed.md"],
  });
  expect(result.succeededPaths).toEqual(["old"]);
  expect(result.failedPaths).toEqual([{ path: "failed.md", error: "readonly" }]);
  expect(result.refreshError).toBe("refresh offline");
  expect(f.disk.has("old/a.md")).toBe(false);
  expect(editorStore.getState().documentsById[a.documentId]).toBeUndefined();
  expect(editorStore.getState().documentsById[b.documentId]).toBeDefined();
});
test("创建禁止无效名称和覆盖，note 自动补扩展名", async () => {
  const f = fixture();
  const created = await f.actions.createEntry({
    workspaceId: "w",
    parentPath: "notes",
    name: "hello",
    kind: "note",
  });
  expect(created.succeededPaths).toEqual(["notes/hello.md"]);
  expect(f.disk.has("notes/hello.md")).toBe(true);
  expect(
    (
      await f.actions.createEntry({
        workspaceId: "w",
        parentPath: "",
        name: "../bad",
        kind: "directory",
      })
    ).failedPaths.length,
  ).toBe(1);
  expect(
    (
      await f.actions.createEntry({
        workspaceId: "w",
        parentPath: "notes",
        name: "hello",
        kind: "note",
      })
    ).failedPaths.length,
  ).toBe(1);
});

test("确认期间阻止新目标身份插入，避免磁盘改名成功后身份冲突", async () => {
  document("old/a.md");
  // 可控制的确认依赖在异步边界尝试打开目标身份。
  let blocked = false;
  const actions = createWorkspaceFileActions({
    workspaceFile: {
      exists: async () => false,
      writeText: async () => {},
      createDirectory: async () => {},
      remove: async () => {},
      rename: async () => {
        try {
          document("new/a.md");
        } catch {
          blocked = true;
        }
      },
    },
    explorer: { invalidatePaths: async () => {} },
    saveCoordinator: {
      withDocumentMutation: async (_ids, operation) =>
        operation({ capture: async () => {}, save: async () => {} }),
    },
    confirmDirty: async () => "discard",
  });
  const value = await actions.renameEntry({ workspaceId: "w", path: "old", nextPath: "new" });
  expect(blocked).toBe(true);
  expect(value.succeededPaths).toEqual(["old"]);
  expect(editorStore.getState().documentsById[editorStore.getState().documentIds[0]].ref).toEqual({
    kind: "workspaceFile",
    workspaceId: "w",
    filePath: "new/a.md",
  });
});
