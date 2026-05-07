import { createStore } from "zustand/vanilla";

export type WorkspaceSessionStoreState = {
  currentWorkspaceId: string | null;
  setCurrentWorkspaceId: (workspaceId: string | null) => void;
  clearCurrentWorkspaceId: () => void;
};

const workspaceSessionStoreApi = createStore<WorkspaceSessionStoreState>()((set) => ({
  currentWorkspaceId: null,
  setCurrentWorkspaceId: (workspaceId) => {
    set((state) => {
      if (state.currentWorkspaceId === workspaceId) {
        return state;
      }

      return {
        currentWorkspaceId: workspaceId,
      };
    });
  },
  clearCurrentWorkspaceId: () => {
    set((state) => {
      if (state.currentWorkspaceId === null) {
        return state;
      }

      return {
        currentWorkspaceId: null,
      };
    });
  },
}));

export const workspaceSessionStore = {
  store: workspaceSessionStoreApi,
  subscribe: workspaceSessionStoreApi.subscribe,
  getCurrentWorkspaceId: (): string | null => {
    return workspaceSessionStoreApi.getState().currentWorkspaceId;
  },
  requireCurrentWorkspaceId: (): string => {
    const currentWorkspaceId = workspaceSessionStoreApi.getState().currentWorkspaceId;

    if (!currentWorkspaceId) {
      throw new Error("current workspace context is not set");
    }

    return currentWorkspaceId;
  },
  setCurrentWorkspaceId: (workspaceId: string | null): void => {
    workspaceSessionStoreApi.getState().setCurrentWorkspaceId(workspaceId);
  },
  clearCurrentWorkspaceId: (): void => {
    workspaceSessionStoreApi.getState().clearCurrentWorkspaceId();
  },
};
