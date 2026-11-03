import { expect, test } from "bun:test";

import { workspaceStateRevisionStore } from "../src/stores/workspace/workspace_state_revision_store";

test("同一工作区连续改名通知所有快照消费者，其他工作区不刷新", () => {
  const store = workspaceStateRevisionStore;
  store.setState({ revisions: {} });
  const subscribeWorkspace = (id: string) => {
    let revision = 0;
    let refreshes = 0;
    const unsubscribe = store.subscribe((state) => {
      const nextRevision = state.revisions[id] ?? 0;
      if (revision !== nextRevision) {
        revision = nextRevision;
        refreshes += 1;
      }
    });
    return { unsubscribe, refreshes: () => refreshes };
  };
  const desktop = subscribeWorkspace("opened");
  const mobile = subscribeWorkspace("opened");
  const other = subscribeWorkspace("other");
  try {
    store.getState().invalidate("opened");
    store.getState().invalidate("opened");
    expect(desktop.refreshes()).toBe(2);
    expect(mobile.refreshes()).toBe(2);
    expect(other.refreshes()).toBe(0);
  } finally {
    desktop.unsubscribe();
    mobile.unsubscribe();
    other.unsubscribe();
  }
});
