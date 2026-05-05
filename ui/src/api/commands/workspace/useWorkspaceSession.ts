import { useSyncExternalStore } from "react";

import { workspaceSession } from "./workspaceSession";

const subscribeCurrentWorkspaceId = (listener: () => void) => {
  return workspaceSession.subscribe(() => {
    listener();
  });
};

const getCurrentWorkspaceIdSnapshot = () => {
  return workspaceSession.getCurrentWorkspaceId();
};

export function useCurrentWorkspaceId(): string | null {
  return useSyncExternalStore(
    subscribeCurrentWorkspaceId,
    getCurrentWorkspaceIdSnapshot,
    getCurrentWorkspaceIdSnapshot,
  );
}

export function useWorkspaceSession() {
  const currentWorkspaceId = useCurrentWorkspaceId();

  return {
    currentWorkspaceId,
    requireCurrentWorkspaceId: workspaceSession.requireCurrentWorkspaceId,
    setCurrentWorkspaceId: workspaceSession.setCurrentWorkspaceId,
    clearCurrentWorkspaceId: workspaceSession.clearCurrentWorkspaceId,
    subscribe: workspaceSession.subscribe,
  };
}
