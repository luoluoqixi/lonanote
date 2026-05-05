import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";

import { WorkspaceState } from "./types";
import { useCurrentWorkspaceId } from "./useWorkspaceSession";
import { workspaceRuntime } from "./workspaceRuntime";

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export interface UseWorkspaceStateResult {
  workspaceId: string | null;
  state: WorkspaceState | null;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isOpening: boolean;
  isClosing: boolean;
  isReinitializing: boolean;
  isBusy: boolean;
  clearError: () => void;
  refresh: (workspaceId?: string | null) => Promise<WorkspaceState | null>;
  open: (workspaceId: string) => Promise<WorkspaceState>;
  close: (workspaceId?: string | null) => Promise<void>;
  reinit: (workspaceId?: string | null) => Promise<WorkspaceState | null>;
}

export function useWorkspaceState(workspaceId: string | null): UseWorkspaceStateResult {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(workspaceId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isReinitializing, setIsReinitializing] = useState(false);
  const requestIdRef = useRef(0);

  const clearError = useEffectEvent(() => {
    startTransition(() => {
      setError(null);
    });
  });

  const commitState = useEffectEvent((nextState: WorkspaceState | null) => {
    startTransition(() => {
      setState(nextState);
    });
  });

  const commitError = useEffectEvent((nextError: string | null) => {
    startTransition(() => {
      setError(nextError);
    });
  });

  const refresh = useEffectEvent(async (nextWorkspaceId?: string | null) => {
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
      const nextState = await workspaceRuntime.getState(targetWorkspaceId);

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
      const nextState = await workspaceRuntime.open(nextWorkspaceId);
      commitState(nextState);
      return nextState;
    } catch (nextError) {
      commitError(toErrorMessage(nextError));
      throw nextError;
    } finally {
      setIsOpening(false);
    }
  });

  const close = useEffectEvent(async (nextWorkspaceId?: string | null) => {
    const targetWorkspaceId = nextWorkspaceId ?? workspaceId;

    if (!targetWorkspaceId) {
      commitState(null);
      commitError(null);
      return;
    }

    setIsClosing(true);
    commitError(null);

    try {
      await workspaceRuntime.close(targetWorkspaceId);

      if (state?.record.metadata.id === targetWorkspaceId || workspaceId === targetWorkspaceId) {
        commitState(null);
      }
    } catch (nextError) {
      commitError(toErrorMessage(nextError));
      throw nextError;
    } finally {
      setIsClosing(false);
    }
  });

  const reinit = useEffectEvent(async (nextWorkspaceId?: string | null) => {
    const targetWorkspaceId = nextWorkspaceId ?? workspaceId;

    if (!targetWorkspaceId) {
      commitState(null);
      commitError(null);
      return null;
    }

    const requestId = ++requestIdRef.current;
    setIsReinitializing(true);
    commitError(null);

    try {
      await workspaceRuntime.reinit(targetWorkspaceId);
      const nextState = await workspaceRuntime.getState(targetWorkspaceId);

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
        setIsReinitializing(false);
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
      setIsReinitializing(false);
      clearError();
      commitState(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    commitError(null);
    commitState(null);

    void workspaceRuntime
      .getState(workspaceId)
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
    isReinitializing,
    isBusy: isLoading || isRefreshing || isOpening || isClosing || isReinitializing,
    clearError,
    refresh,
    open,
    close,
    reinit,
  };
}

export function useCurrentWorkspaceState(): UseWorkspaceStateResult {
  const currentWorkspaceId = useCurrentWorkspaceId();
  return useWorkspaceState(currentWorkspaceId);
}
