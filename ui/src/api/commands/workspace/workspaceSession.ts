type WorkspaceSessionListener = (workspaceId: string | null) => void;

let currentWorkspaceId: string | null = null;
const listeners = new Set<WorkspaceSessionListener>();

const emitWorkspaceSessionChange = () => {
  for (const listener of listeners) {
    listener(currentWorkspaceId);
  }
};

export const workspaceSession = {
  getCurrentWorkspaceId: (): string | null => {
    return currentWorkspaceId;
  },
  requireCurrentWorkspaceId: (): string => {
    if (!currentWorkspaceId) {
      throw new Error("current workspace context is not set");
    }

    return currentWorkspaceId;
  },
  setCurrentWorkspaceId: (workspaceId: string | null): void => {
    if (currentWorkspaceId === workspaceId) {
      return;
    }

    currentWorkspaceId = workspaceId;
    emitWorkspaceSessionChange();
  },
  clearCurrentWorkspaceId: (): void => {
    workspaceSession.setCurrentWorkspaceId(null);
  },
  subscribe: (listener: WorkspaceSessionListener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
