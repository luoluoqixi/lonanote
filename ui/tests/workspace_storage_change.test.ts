import { expect, test } from "bun:test";

import {
  createEditorCloseActions,
  getWorkspaceCloseTargets,
} from "../src/components/editor/controllers/editor_close_actions";
import { changeWorkspaceStorage } from "../src/components/workspaces/workspace_select/workspace_storage_change";
import { editorStore, isDocumentDirty } from "../src/stores/editor";
import { workspaceResourceSessionStore } from "../src/stores/workspace/workspace_resource_session_store";

function setup(
  options: { cancel?: boolean; failChange?: boolean; failReopen?: boolean; open?: boolean } = {},
) {
  const events: string[] = [];
  const deps = {
    isOpen: async () => options.open !== false,
    close: async () => {
      events.push("close");
    },
    open: async () => {
      events.push("open");
      if (options.failReopen) throw new Error("重开失败");
    },
    withClose: async (_id: string, action: () => Promise<void>) => {
      events.push("save-barrier");
      if (options.cancel) return false;
      await action();
      events.push("discard-editors");
      return true;
    },
  };
  const change = async () => {
    events.push("change");
    if (options.failChange) throw new Error("迁移失败");
    return { status: "removed" as const };
  };
  return { events, deps, change };
}

test("取消保存不会关闭或迁移工作区", async () => {
  const { events, deps, change } = setup({ cancel: true });
  expect((await changeWorkspaceStorage("id", change, deps)).completed).toBe(false);
  expect(events).toEqual(["save-barrier"]);
});

test("桌面在保存屏障内执行一次原子变更，不调用分离的关闭和重开", async () => {
  const { events, deps, change } = setup();
  const result = await changeWorkspaceStorage("id", change, {
    ...deps,
    atomicChange: async () => {
      events.push("atomic");
      return { wasOpen: true, reopened: true, reopenError: null, sourceCleanup: null };
    },
  });
  expect(result.completed).toBe(true);
  expect(events).toEqual(["save-barrier", "atomic", "discard-editors"]);
});

test("在保存屏障内关闭、迁移并重开，然后才销毁旧编辑器", async () => {
  const { events, deps, change } = setup();
  expect(await changeWorkspaceStorage("id", change, deps)).toMatchObject({
    completed: true,
    wasOpen: true,
    reopened: true,
  });
  expect(events).toEqual(["save-barrier", "close", "change", "open", "discard-editors"]);
});

test("变更失败恢复 Core 并抛错，保留旧编辑器", async () => {
  const { events, deps, change } = setup({ failChange: true });
  await expect(changeWorkspaceStorage("id", change, deps)).rejects.toThrow("迁移失败");
  expect(events).toEqual(["save-barrier", "close", "change", "open"]);
});

test("提交成功但重开失败应返回成功和警告，不能重复迁移", async () => {
  const { events, deps, change } = setup({ failReopen: true });
  expect(await changeWorkspaceStorage("id", change, deps)).toMatchObject({
    completed: true,
    reopened: false,
    reopenError: "重开失败",
  });
  expect(events.at(-1)).toBe("discard-editors");
});

test("原先关闭的工作区变更后保持关闭", async () => {
  const { events, deps, change } = setup({ open: false });
  expect(await changeWorkspaceStorage("id", change, deps)).toMatchObject({
    completed: true,
    wasOpen: false,
  });
  expect(events).toEqual(["save-barrier", "change", "discard-editors"]);
});

test("真实保存屏障在迁移失败后保留工作区标签和未保存内容", async () => {
  editorStore.setState({
    documentIds: [],
    documentsById: {},
    documentIdByKey: {},
    openEditorIds: [],
    editorsById: {},
    viewersById: {},
    activeEditorId: null,
  });
  const { editorId, documentId } = editorStore
    .getState()
    .openEditor({ kind: "workspaceFile", workspaceId: "id", filePath: "note.md" });
  editorStore.getState().setDocumentDraft(documentId, "尚未保存的内容");
  const closeActions = createEditorCloseActions({
    confirmDirty: async () => "discard",
    saveCoordinator: {
      withDocumentMutation: async (_ids, action) =>
        action({ capture: async () => {}, save: async () => {} }),
    },
  });
  let coreOpen = true;
  await expect(
    changeWorkspaceStorage(
      "id",
      async () => {
        throw new Error("目标不可写");
      },
      {
        isOpen: async () => coreOpen,
        close: async () => {
          coreOpen = false;
        },
        open: async () => {
          coreOpen = true;
        },
        withClose: (id, action) => closeActions.close(getWorkspaceCloseTargets(id), action),
      },
    ),
  ).rejects.toThrow("目标不可写");
  expect(coreOpen).toBe(true);
  expect(editorStore.getState().openEditorIds).toContain(editorId);
  expect(editorStore.getState().documentsById[documentId].draft).toBe("尚未保存的内容");
  expect(isDocumentDirty(editorStore.getState().documentsById[documentId])).toBe(true);
});

test("失败恢复同 ID Core 后发布资源版本，让保留的 Markdown 和媒体重新获取 scope", async () => {
  const { deps, change } = setup({ failChange: true });
  const before = workspaceResourceSessionStore.getState().revisions.id ?? 0;
  const acquired: string[] = [];
  const release = workspaceResourceSessionStore.subscribe((state) => {
    if (state.revisions.id !== before) acquired.push(`scope-${state.revisions.id}`);
  });
  await expect(
    changeWorkspaceStorage("id", change, {
      ...deps,
      sessionChanged: (id) => workspaceResourceSessionStore.getState().invalidate(id),
    }),
  ).rejects.toThrow("迁移失败");
  expect(acquired).toEqual([`scope-${before + 1}`]);
  release();
});

test("桌面原子变更失败仍失效资源版本，保存屏障保留编辑器", async () => {
  const { events, deps, change } = setup();
  await expect(
    changeWorkspaceStorage("id", change, {
      ...deps,
      atomicChange: async () => {
        events.push("atomic");
        throw new Error("迁移失败");
      },
      sessionChanged: () => {
        events.push("invalidate");
      },
    }),
  ).rejects.toThrow("迁移失败");
  expect(events).toEqual(["save-barrier", "atomic", "invalidate"]);
});

test("桌面取消保存不提交原子变更也不失效资源", async () => {
  const { events, deps, change } = setup({ cancel: true });
  const result = await changeWorkspaceStorage("id", change, {
    ...deps,
    atomicChange: async () => {
      throw new Error("不应调用");
    },
    sessionChanged: () => {
      throw new Error("不应调用");
    },
  });
  expect(result.completed).toBe(false);
  expect(events).toEqual(["save-barrier"]);
});
