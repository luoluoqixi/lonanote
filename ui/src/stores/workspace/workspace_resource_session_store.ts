import { createStore } from "zustand/vanilla";

type WorkspaceResourceSessionState = {
  revisions: Record<string, number>;
  invalidate: (workspaceId: string) => void;
};

/** Core close 会撤销所有 scope；同 ID 重开也必须通知仍挂载的资源消费者。 */
export const workspaceResourceSessionStore = createStore<WorkspaceResourceSessionState>()(
  (set) => ({
    revisions: {},
    invalidate: (workspaceId) =>
      set((state) => ({
        revisions: { ...state.revisions, [workspaceId]: (state.revisions[workspaceId] ?? 0) + 1 },
      })),
  }),
);
