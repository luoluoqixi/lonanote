import { createStore } from "zustand/vanilla";

type WorkspaceStateRevisionState = {
  revisions: Record<string, number>;
  invalidate: (workspaceId: string) => void;
};

/** 元信息变更独立于文件资源会话，通知同 ID 的所有快照消费者重新读取。 */
export const workspaceStateRevisionStore = createStore<WorkspaceStateRevisionState>()((set) => ({
  revisions: {},
  invalidate: (workspaceId) =>
    set((state) => ({
      revisions: { ...state.revisions, [workspaceId]: (state.revisions[workspaceId] ?? 0) + 1 },
    })),
}));
