import { expect, test } from "bun:test";

import type {
  WorkspaceDirectorySnapshot,
  WorkspaceIndexEntry,
} from "../src/api/commands/workspace/types";
import { createWorkspaceExplorerStore } from "../src/stores/workspace/workspace_explorer_store";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function entry(path: string, fileType: "file" | "directory" = "directory"): WorkspaceIndexEntry {
  return { path, fileType, size: null, createTime: null, lastModifiedTime: null };
}
const snapshot = (
  path: string,
  entries: WorkspaceIndexEntry[] = [],
): WorkspaceDirectorySnapshot => ({ path, entries });
function fixture() {
  const calls: string[] = [];
  const content: Record<string, WorkspaceIndexEntry[]> = {
    "": [entry("A"), entry("B")],
    A: [entry("A/sub")],
    "A/sub": [],
    B: [],
  };
  const store = createWorkspaceExplorerStore({
    getDirectory: async (_, path) => {
      calls.push(path);
      return snapshot(path, content[path] ?? []);
    },
    refresh: async () => {},
  });
  return { store, actions: store.getState(), calls, content };
}

test("初始化只枚举根，展开重读当前层，收起无读取", async () => {
  const { actions, calls } = fixture();
  await actions.loadDirectory("w", "", { reload: true });
  expect(calls).toEqual([""]);
  await actions.setExpanded("w", "A", true);
  await actions.setExpanded("w", "A", false);
  expect(calls).toEqual(["", "A"]);
  await actions.setExpanded("w", "A", true);
  expect(calls).toEqual(["", "A", "A"]);
});

test("同代次缓存读取去重，reload 淘汰旧读取；失败保留旧快照", async () => {
  const first = deferred<WorkspaceDirectorySnapshot>();
  const second = deferred<WorkspaceDirectorySnapshot>();
  let count = 0;
  const store = createWorkspaceExplorerStore({
    getDirectory: () => (++count === 1 ? first.promise : second.promise),
    refresh: async () => {},
  });
  const a = store.getState();
  const p1 = a.loadDirectory("w", "", { reload: false });
  const p2 = a.loadDirectory("w", "", { reload: false });
  expect(count).toBe(1);
  const fresh = a.loadDirectory("w", "", { reload: true });
  second.resolve(snapshot("", [entry("new")]));
  await fresh;
  first.resolve(snapshot("", [entry("old")]));
  await Promise.all([p1, p2]);
  expect(store.getState().workspaces.w.directories[""].snapshot?.entries[0].path).toBe("new");
});

test("close 后同 ID 重开，旧 promise 不能发布", async () => {
  const old = deferred<WorkspaceDirectorySnapshot>();
  let count = 0;
  const store = createWorkspaceExplorerStore({
    getDirectory: async () => (++count === 1 ? old.promise : snapshot("", [entry("new")])),
    refresh: async () => {},
  });
  const a = store.getState();
  const pending = a.loadDirectory("w", "", { reload: true });
  const epoch = store.getState().workspaces.w.epoch;
  a.resetWorkspace("w");
  await a.loadDirectory("w", "", { reload: true });
  old.resolve(snapshot("", [entry("old")]));
  await pending;
  expect(store.getState().workspaces.w.epoch).not.toBe(epoch);
  expect(store.getState().workspaces.w.directories[""].snapshot?.entries[0].path).toBe("new");
});

test("刷新只读有效展开链，祖先删除剪枝后代，目录模式只读当前层", async () => {
  const { store, actions, calls, content } = fixture();
  await actions.loadDirectory("w", "", { reload: true });
  await actions.setExpanded("w", "A", true);
  await actions.setExpanded("w", "A/sub", true);
  await actions.setExpanded("w", "B", true);
  await actions.setExpanded("w", "B", false);
  calls.length = 0;
  await actions.refreshVisible("w", "tree", "");
  expect(calls).toEqual(["", "A", "A/sub"]);
  content[""] = [entry("B")];
  calls.length = 0;
  await actions.refreshVisible("w", "tree", "");
  expect(calls).toEqual([""]);
  expect(store.getState().workspaces.w.directories.A).toBeUndefined();
  expect(store.getState().workspaces.w.expandedPaths).not.toContain("A/sub");
  calls.length = 0;
  await actions.refreshVisible("w", "directory", "B");
  expect(calls).toEqual(["B"]);
});

test("失败与空目录不同，重试成功替换错误", async () => {
  let fail = false;
  const store = createWorkspaceExplorerStore({
    getDirectory: async (_, p) => {
      if (fail) throw new Error("offline");
      return snapshot(p);
    },
    refresh: async () => {},
  });
  const a = store.getState();
  await a.loadDirectory("w", "A", { reload: true });
  fail = true;
  await expect(a.loadDirectory("w", "A", { reload: true })).rejects.toThrow("offline");
  expect(store.getState().workspaces.w.directories.A.snapshot?.entries).toEqual([]);
  expect(store.getState().workspaces.w.directories.A.error).toBe("offline");
  fail = false;
  await a.loadDirectory("w", "A", { reload: true });
  expect(store.getState().workspaces.w.directories.A.error).toBeNull();
});

test("祖先刷新失败暂停分支，保留旧树", async () => {
  const { actions, calls } = fixture();
  await actions.loadDirectory("w", "", { reload: true });
  await actions.setExpanded("w", "A", true);
  // 独立 store 用持久的真实投影与可控失败。
  let fail = false;
  const reads: string[] = [];
  const store = createWorkspaceExplorerStore({
    getDirectory: async (_, p) => {
      reads.push(p);
      if (fail && p === "") throw new Error("offline");
      return snapshot(p, p === "" ? [entry("A")] : []);
    },
    refresh: async () => {},
  });
  await store.getState().loadDirectory("w", "", { reload: true });
  await store.getState().setExpanded("w", "A", true);
  reads.length = 0;
  fail = true;
  await expect(store.getState().refreshVisible("w", "tree", "")).rejects.toThrow("offline");
  expect(reads).toEqual([""]);
  expect(store.getState().workspaces.w.directories[""].snapshot?.entries[0].path).toBe("A");
  expect(calls.length).toBe(2);
});

test("无 host mutation 只标 stale，定位只展开祖先链", async () => {
  const { store, actions, calls } = fixture();
  await actions.loadDirectory("w", "", { reload: true });
  calls.length = 0;
  await actions.invalidatePaths("w", ["A/new/deep.md"]);
  expect(calls).toEqual([]);
  expect(store.getState().workspaces.w.directories[""].stale).toBe(true);
  await actions.revealPath("w", "A/sub");
  expect(calls).toEqual(["", "A"]);
  expect(store.getState().workspaces.w.focusedPath).toBe("A/sub");
});

test("同层刷新并发不超过 4，刷新途中收起不进入后代", async () => {
  let active = 0;
  let maximum = 0;
  const calls: string[] = [];
  const store = createWorkspaceExplorerStore({
    getDirectory: async (_, p) => {
      calls.push(p);
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((r) => setTimeout(r, 1));
      active--;
      return snapshot(p, p === "" ? Array.from({ length: 9 }, (_, n) => entry(`D${n}`)) : []);
    },
    refresh: async () => {},
  });
  const a = store.getState();
  await a.loadDirectory("w", "", { reload: true });
  for (let n = 0; n < 9; n++) await a.setExpanded("w", `D${n}`, true);
  calls.length = 0;
  await a.refreshVisible("w", "tree", "");
  expect(maximum).toBeLessThanOrEqual(4);
  expect(calls.length).toBe(10);
});

test("刷新途中收起祖先，不读取仍保留展开意图的隐藏后代", async () => {
  let paused = false;
  const entered = deferred<void>();
  const release = deferred<void>();
  const calls: string[] = [];
  const store = createWorkspaceExplorerStore({
    getDirectory: async (_, p) => {
      calls.push(p);
      if (paused && p === "A") {
        entered.resolve();
        await release.promise;
      }
      return snapshot(p, p === "" ? [entry("A")] : p === "A" ? [entry("A/sub")] : []);
    },
    refresh: async () => {},
  });
  const a = store.getState();
  await a.loadDirectory("w", "", { reload: true });
  await a.setExpanded("w", "A", true);
  await a.setExpanded("w", "A/sub", true);
  paused = true;
  calls.length = 0;
  const refresh = a.refreshVisible("w", "tree", "");
  await entered.promise;
  await a.setExpanded("w", "A", false);
  release.resolve();
  await refresh;
  expect(calls).toEqual(["", "A"]);
});

test("再展开恢复后代意图时逐层重读，mutation 不读取无关可见分支", async () => {
  const { actions, calls } = fixture();
  await actions.loadDirectory("w", "", { reload: true });
  await actions.setExpanded("w", "A", true);
  await actions.setExpanded("w", "A/sub", true);
  await actions.setExpanded("w", "B", true);
  await actions.setExpanded("w", "A", false);
  calls.length = 0;
  await actions.setExpanded("w", "A", true);
  expect(calls).toEqual(["A", "A/sub"]);
  const release = actions.registerHost("w", "tree", "");
  calls.length = 0;
  await actions.invalidatePaths("w", ["A/new.md"]);
  expect(calls).toEqual(["", "A"]);
  release();
});

test("祖先收起后，迟到展开结果不能恢复读取隐藏后代", async () => {
  const delayed = deferred<WorkspaceDirectorySnapshot>();
  const calls: string[] = [];
  let pause = false;
  const content: Record<string, WorkspaceIndexEntry[]> = {
    "": [entry("A")],
    A: [entry("A/B")],
    "A/B": [entry("A/B/C")],
    "A/B/C": [],
  };
  const store = createWorkspaceExplorerStore({
    getDirectory: async (_, path) => {
      calls.push(path);
      return pause && path === "A/B" ? delayed.promise : snapshot(path, content[path]);
    },
    refresh: async () => {},
  });
  const actions = store.getState();
  await actions.loadDirectory("w", "", { reload: true });
  for (const path of ["A", "A/B", "A/B/C"]) await actions.setExpanded("w", path, true);
  calls.length = 0;
  pause = true;
  const pending = actions.setExpanded("w", "A/B", true);
  await actions.setExpanded("w", "A", false);
  delayed.resolve(snapshot("A/B", content["A/B"]));
  await pending;
  expect(calls).toEqual(["A/B"]);
  expect(store.getState().workspaces.w.expandedPaths).toContain("A/B/C");
});
