import { useStore } from "zustand";

import { workspaceSessionStore } from "@/stores/workspace";

export function useCurrentWorkspaceId(): string | null {
  return useStore(workspaceSessionStore.store, (state) => state.currentWorkspaceId);
}

export function useWorkspaceSession() {
  const currentWorkspaceId = useCurrentWorkspaceId();

  return {
    currentWorkspaceId,
    requireCurrentWorkspaceId: workspaceSessionStore.requireCurrentWorkspaceId,
    setCurrentWorkspaceId: workspaceSessionStore.setCurrentWorkspaceId,
    clearCurrentWorkspaceId: workspaceSessionStore.clearCurrentWorkspaceId,
    subscribe: workspaceSessionStore.subscribe,
  };
}
