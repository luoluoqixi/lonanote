import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { readSplitLayoutState, writeSplitLayoutState } from "./storage";
import type { SplitLayoutProviderProps, SplitLayoutState } from "./types";

type SplitLayoutStorageEntry = {
  ready: boolean;
  state?: SplitLayoutState;
};

type SplitLayoutStateUpdater =
  | SplitLayoutState
  | ((prev: SplitLayoutState | undefined) => SplitLayoutState);

type SplitLayoutStorageContextValue = {
  ready: boolean;
  state: SplitLayoutState | undefined;
  storageKey?: string;
  setState: (updater: SplitLayoutStateUpdater) => void;
};

const SplitLayoutStorageContext = createContext<SplitLayoutStorageContextValue | null>(null);

const resolveNextState = (
  updater: SplitLayoutStateUpdater,
  prev: SplitLayoutState | undefined,
): SplitLayoutState => {
  return typeof updater === "function"
    ? (updater as (prev: SplitLayoutState | undefined) => SplitLayoutState)(prev)
    : updater;
};

const createReadyEntry = (state?: SplitLayoutState): SplitLayoutStorageEntry => ({
  ready: true,
  state,
});

const areArraysEqual = (
  left: readonly unknown[] | undefined,
  right: readonly unknown[] | undefined,
) => {
  if (left === right) return true;
  if (!left || !right) return !left && !right;
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) return false;
  }

  return true;
};

const isSplitLayoutStateEqual = (
  left: SplitLayoutState | undefined,
  right: SplitLayoutState | undefined,
) => {
  if (left === right) return true;
  if (!left || !right) return !left && !right;

  return areArraysEqual(left.sizes, right.sizes) && areArraysEqual(left.visible, right.visible);
};

export function SplitLayoutProvider({
  children,
  fallbackState,
  storageKey,
}: SplitLayoutProviderProps) {
  const [entry, setEntry] = useState<SplitLayoutStorageEntry>(() =>
    storageKey ? { ready: false, state: fallbackState } : createReadyEntry(fallbackState),
  );
  const entryRef = useRef(entry);

  useEffect(() => {
    entryRef.current = entry;
  }, [entry]);

  useEffect(() => {
    if (!storageKey) {
      setEntry(createReadyEntry(fallbackState));
      return;
    }

    let cancelled = false;
    setEntry({ ready: false, state: fallbackState });

    void readSplitLayoutState(storageKey).then((state) => {
      if (cancelled) return;
      setEntry(createReadyEntry(state ?? fallbackState));
    });

    return () => {
      cancelled = true;
    };
  }, [fallbackState, storageKey]);

  const setState = useCallback(
    (updater: SplitLayoutStateUpdater) => {
      if (!storageKey) return;

      const prevEntry = entryRef.current;
      const nextState = resolveNextState(updater, prevEntry.state ?? fallbackState);
      if (isSplitLayoutStateEqual(prevEntry.state, nextState) && prevEntry.ready) {
        return;
      }

      entryRef.current = createReadyEntry(nextState);
      void writeSplitLayoutState(storageKey, nextState);
    },
    [fallbackState, storageKey],
  );

  return (
    <SplitLayoutStorageContext.Provider
      value={{
        ready: !storageKey || entry.ready,
        state: entry.state ?? fallbackState,
        storageKey,
        setState,
      }}
    >
      {children}
    </SplitLayoutStorageContext.Provider>
  );
}

export function useSplitLayoutStorage(
  storageKey?: string,
  fallbackState?: SplitLayoutState,
): {
  ready: boolean;
  state: SplitLayoutState | undefined;
  setState: (updater: SplitLayoutStateUpdater) => void;
} {
  const context = useContext(SplitLayoutStorageContext);
  const resolvedStorageKey = storageKey ?? context?.storageKey;
  const [fallbackEntry, setFallbackEntry] = useState<SplitLayoutStorageEntry>(() =>
    createReadyEntry(fallbackState),
  );
  const fallbackEntryRef = useRef(fallbackEntry);

  useEffect(() => {
    fallbackEntryRef.current = fallbackEntry;
  }, [fallbackEntry]);

  useEffect(() => {
    if (!storageKey && context) {
      return;
    }

    if (!resolvedStorageKey) {
      setFallbackEntry(createReadyEntry(fallbackState));
      return;
    }

    let cancelled = false;
    setFallbackEntry({ ready: false, state: fallbackState });
    void readSplitLayoutState(resolvedStorageKey).then((state) => {
      if (cancelled) return;
      setFallbackEntry(createReadyEntry(state ?? fallbackState));
    });

    return () => {
      cancelled = true;
    };
  }, [context, fallbackState, resolvedStorageKey, storageKey]);

  const entry = !storageKey && context ? createReadyEntry(context.state) : fallbackEntry;

  const setState = useCallback(
    (updater: SplitLayoutStateUpdater) => {
      if (!storageKey && context) {
        context.setState(updater);
        return;
      }

      if (!resolvedStorageKey) return;

      const prevEntry = fallbackEntryRef.current;
      const nextState = resolveNextState(updater, prevEntry.state ?? fallbackState);
      if (isSplitLayoutStateEqual(prevEntry.state, nextState) && prevEntry.ready) {
        return;
      }

      fallbackEntryRef.current = createReadyEntry(nextState);
      void writeSplitLayoutState(resolvedStorageKey, nextState);
    },
    [context, fallbackState, resolvedStorageKey, storageKey],
  );

  return {
    ready: !resolvedStorageKey || (!storageKey && context ? context.ready : entry?.ready === true),
    state: entry?.state ?? fallbackState,
    setState,
  };
}
