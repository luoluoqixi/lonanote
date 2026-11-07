import { expect, test } from "bun:test";

import { createClosePreparation } from "../src/api/common/window_close_preparation";
import {
  createRemoteWindowCloseRegistry,
  prepareAuxiliaryWindowClose,
} from "../src/components/editor/controllers/editor_window_close";
import { isDocumentDirty } from "../src/stores/editor/editor_document_types";
import { editorStore } from "../src/stores/editor/editor_store";

test("owner 关联关闭时辅助只 flush，不重复确认或提前释放视图", async () => {
  const events: string[] = [];
  const preparation = prepareAuxiliaryWindowClose({
    requestId: "session",
    editorIds: ["remote"],
    closingOwner: true,
    flush: async () => {
      events.push("flush");
    },
    prepareOwner: async () => {
      events.push("prepare");
      return true;
    },
    finishOwner: async () => {
      events.push("finish");
      return true;
    },
  });
  expect(await preparation.ready).toBe(true);
  expect(events).toEqual(["flush"]);
  expect(await preparation.finish(false)).toBe(false);
  expect(events).toEqual(["flush"]);
});

test("单独辅助关闭等待owner确认且Rust取消会撤销owner准备", async () => {
  const events: string[] = [];
  const preparation = prepareAuxiliaryWindowClose({
    requestId: "single",
    editorIds: ["remote"],
    closingOwner: false,
    flush: async () => {
      events.push("flush");
    },
    prepareOwner: async (requestId, ids) => {
      events.push(`${requestId}:${ids.join()}`);
      return true;
    },
    finishOwner: async (_, commit) => {
      events.push(`finish:${commit}`);
      return commit;
    },
  });
  expect(await preparation.ready).toBe(true);
  expect(events).toEqual(["flush", "single:remote"]);
  expect(await preparation.finish(false)).toBe(false);
  expect(events).toEqual(["flush", "single:remote", "finish:false"]);
});

test("flush失败不向owner提交关闭，owner取消不能冒充准备成功", async () => {
  let calls = 0;
  const deps = {
    requestId: "failure",
    editorIds: ["remote"],
    closingOwner: false,
    flush: async () => {
      throw new Error("未确认输入");
    },
    prepareOwner: async () => {
      calls++;
      return false;
    },
    finishOwner: async () => true,
  };
  const failure = prepareAuxiliaryWindowClose(deps);
  expect(await failure.ready).toBe(false);
  expect(calls).toBe(0);
  const cancelled = prepareAuxiliaryWindowClose({ ...deps, flush: async () => {} });
  expect(await cancelled.ready).toBe(false);
  expect(calls).toBe(1);
});

test("远端销毁会撤销准备锁，其他成员不能提交该事务", async () => {
  const registry = createRemoteWindowCloseRegistry();
  let aborted = false;
  expect(
    await registry.prepare("request", "aux", () =>
      createClosePreparation(async (wait, signal) => {
        signal.addEventListener("abort", () => {
          aborted = true;
        });
        return wait();
      }),
    ),
  ).toBe(true);
  await expect(registry.finish("request", true, "other")).rejects.toThrow("不属于");
  await registry.abort("aux");
  expect(aborted).toBe(true);
  expect(await registry.finish("request", true, "aux")).toBe(false);
  let restarted = false;
  expect(
    await registry.prepare("request", "aux", () => {
      restarted = true;
      return createClosePreparation(async () => true);
    }),
  ).toBe(false);
  expect(restarted).toBe(false);
});

test("失主辅助关闭本地取消保留dirty，不请求owner且优先于关联关闭", async () => {
  const { documentId } = editorStore
    .getState()
    .openEditor({ kind: "untitled" }, { initialText: "失联后唯一草稿" });
  let requests = 0;
  const preparation = prepareAuxiliaryWindowClose({
    requestId: "orphan",
    editorIds: ["view"],
    closingOwner: true,
    isOwnerDestroyed: async () => true,
    confirmOrphanedClose: async () => "cancel",
    copyRecoveryDraft: async () => {},
    flush: async () => {
      requests++;
    },
    prepareOwner: async () => {
      requests++;
      return true;
    },
    finishOwner: async () => {
      requests++;
      return true;
    },
  });
  expect(await preparation.ready).toBe(false);
  expect(await preparation.finish(false)).toBe(false);
  expect(editorStore.getState().documentsById[documentId].draft).toBe("失联后唯一草稿");
  expect(isDocumentDirty(editorStore.getState().documentsById[documentId])).toBe(true);
  expect(requests).toBe(0);
});

test("失主辅助复制后等待原生commit，abort不清草稿，commit允许关窗", async () => {
  let copied = 0;
  const { documentId } = editorStore
    .getState()
    .openEditor({ kind: "untitled" }, { initialText: "唯一草稿" });
  const deps = {
    requestId: "orphan",
    editorIds: ["view"],
    closingOwner: false,
    isOwnerDestroyed: async () => true,
    confirmOrphanedClose: async () => "copy" as const,
    copyRecoveryDraft: async () => {
      copied++;
    },
    flush: async () => {
      throw new Error("不应flush失主窗口");
    },
    prepareOwner: async () => false,
    finishOwner: async () => false,
  };
  const aborted = prepareAuxiliaryWindowClose(deps);
  expect(await aborted.ready).toBe(true);
  expect(copied).toBe(1);
  expect(editorStore.getState().documentsById[documentId].draft).toBe("唯一草稿");
  expect(await aborted.finish(false)).toBe(false);
  const committed = prepareAuxiliaryWindowClose(deps);
  expect(await committed.ready).toBe(true);
  expect(await committed.finish(true)).toBe(true);
  expect(editorStore.getState().documentsById[documentId].draft).toBe("唯一草稿");
});
