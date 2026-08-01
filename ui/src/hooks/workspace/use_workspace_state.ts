import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";

import { type WorkspaceSnapshot, workspace, workspaceIndex } from "@/api/commands/workspace";
import { workspaceSessionStore } from "@/stores/workspace";

import { useCurrentWorkspaceId } from "./use_workspace_session";

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export interface UseWorkspaceStateResult {
  workspaceId: string | null;
  state: WorkspaceSnapshot | null;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isOpening: boolean;
  isClosing: boolean;
  isRefreshingIndex: boolean;
  isBusy: boolean;
  clearError: () => void;
  refresh: (workspaceId?: string) => Promise<WorkspaceSnapshot | null>;
  open: (workspaceId: string) => Promise<WorkspaceSnapshot>;
  close: (workspaceId?: string) => Promise<void>;
  refreshIndex: (workspaceId?: string) => Promise<WorkspaceSnapshot | null>;
}

export function useWorkspaceState(workspaceId: string | null): UseWorkspaceStateResult {
  const [state, setState] = useState<WorkspaceSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(workspaceId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isRefreshingIndex, setIsRefreshingIndex] = useState(false);
  const requestIdRef = useRef(0);

  const clearError = useEffectEvent(() => {
    startTransition(() => {
      setError(null);
    });
  });

  const commitState = useEffectEvent((nextState: WorkspaceSnapshot | null) => {
    startTransition(() => {
      setState(nextState);
    });
  });

  const commitError = useEffectEvent((nextError: string | null) => {
    startTransition(() => {
      setError(nextError);
    });
  });

  const refresh = useEffectEvent(async (nextWorkspaceId?: string) => {
    const targetWorkspaceId = nextWorkspaceId ?? workspaceId;

    if (!targetWorkspaceId) {
      requestIdRef.current += 1;
      commitError(null);
      commitState(null);
      return null;
    }

    const requestId = ++requestIdRef.current;
    setIsRefreshing(true);
    commitError(null);

    try {
      const nextState = await workspace.get(targetWorkspaceId);

      if (requestId === requestIdRef.current) {
        commitState(nextState);
      }

      return nextState;
    } catch (nextError) {
      if (requestId === requestIdRef.current) {
        commitError(toErrorMessage(nextError));
      }

      throw nextError;
    } finally {
      if (requestId === requestIdRef.current) {
        setIsRefreshing(false);
      }
    }
  });

  const open = useEffectEvent(async (nextWorkspaceId: string) => {
    setIsOpening(true);
    commitError(null);

    try {
      const nextState = await workspace.open(nextWorkspaceId);
      workspaceSessionStore.setCurrentWorkspaceId(nextWorkspaceId);
      commitState(nextState);
      return nextState;
    } catch (nextError) {
      commitError(toErrorMessage(nextError));
      throw nextError;
    } finally {
      setIsOpening(false);
    }
  });

  const close = useEffectEvent(async (nextWorkspaceId?: string) => {
    const targetWorkspaceId = nextWorkspaceId ?? workspaceId;

    if (!targetWorkspaceId) {
      commitState(null);
      commitError(null);
      return;
    }

    setIsClosing(true);
    commitError(null);

    try {
      await workspace.close(targetWorkspaceId);

      if (workspaceSessionStore.getCurrentWorkspaceId() === targetWorkspaceId) {
        workspaceSessionStore.clearCurrentWorkspaceId();
      }
      if (state?.id === targetWorkspaceId || workspaceId === targetWorkspaceId) {
        commitState(null);
      }
    } catch (nextError) {
      commitError(toErrorMessage(nextError));
      throw nextError;
    } finally {
      setIsClosing(false);
    }
  });

  const refreshIndex = useEffectEvent(async (nextWorkspaceId?: string) => {
    const targetWorkspaceId = nextWorkspaceId ?? workspaceId;

    if (!targetWorkspaceId) {
      commitState(null);
      commitError(null);
      return null;
    }

    const requestId = ++requestIdRef.current;
    setIsRefreshingIndex(true);
    commitError(null);

    try {
      await workspaceIndex.refresh(targetWorkspaceId);
      const nextState = await workspace.get(targetWorkspaceId);

      if (requestId === requestIdRef.current) {
        commitState(nextState);
      }

      return nextState;
    } catch (nextError) {
      if (requestId === requestIdRef.current) {
        commitError(toErrorMessage(nextError));
      }

      throw nextError;
    } finally {
      if (requestId === requestIdRef.current) {
        setIsRefreshingIndex(false);
      }
    }
  });

  useEffect(() => {
    if (!workspaceId) {
      requestIdRef.current += 1;
      setIsLoading(false);
      setIsRefreshing(false);
      setIsOpening(false);
      setIsClosing(false);
      setIsRefreshingIndex(false);
      clearError();
      commitState(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    commitError(null);
    commitState(null);

    void workspace
      .get(workspaceId)
      .then((nextState) => {
        if (requestId === requestIdRef.current) {
          commitState(nextState);
        }
      })
      .catch((nextError) => {
        if (requestId === requestIdRef.current) {
          commitError(toErrorMessage(nextError));
        }
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      });
  }, [workspaceId]);

  return {
    workspaceId,
    state,
    error,
    isLoading,
    isRefreshing,
    isOpening,
    isClosing,
    isRefreshingIndex,
    isBusy: isLoading || isRefreshing || isOpening || isClosing || isRefreshingIndex,
    clearError,
    refresh,
    open,
    close,
    refreshIndex,
  };
}

export function useCurrentWorkspaceState(): UseWorkspaceStateResult {
  const currentWorkspaceId = useCurrentWorkspaceId();
  return useWorkspaceState(currentWorkspaceId);
}
