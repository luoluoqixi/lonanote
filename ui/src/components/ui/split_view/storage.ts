import { store } from "@/api/commands";
import { isInvokeAvailable } from "@/api/invoke";

import type { SplitLayoutState } from "./types";

const canUseLocalStorage = () => {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
};

const isFiniteNumberArray = (value: unknown): value is number[] => {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
};

const isBooleanArray = (value: unknown): value is boolean[] => {
  return Array.isArray(value) && value.every((item) => typeof item === "boolean");
};

const parseSplitLayoutState = (value: unknown): SplitLayoutState | undefined => {
  if (typeof value === "undefined" || value === null) return undefined;

  const parsed =
    typeof value === "string" ? (JSON.parse(value) as Partial<SplitLayoutState>) : value;

  if (!parsed || typeof parsed !== "object") return undefined;

  const state = parsed as Partial<SplitLayoutState>;
  if (!isFiniteNumberArray(state.sizes) || !isBooleanArray(state.visible)) return undefined;

  return {
    sizes: state.sizes,
    visible: state.visible,
  };
};

export async function readSplitLayoutState(
  storageKey?: string,
): Promise<SplitLayoutState | undefined> {
  if (!storageKey) return undefined;

  if (isInvokeAvailable()) {
    try {
      const value = await store.commonGet<unknown>(storageKey);
      return parseSplitLayoutState(value);
    } catch {
      return undefined;
    }
  }

  if (!canUseLocalStorage()) return undefined;

  try {
    const raw = window.localStorage.getItem(storageKey);
    return parseSplitLayoutState(raw);
  } catch {
    return undefined;
  }
}

export async function writeSplitLayoutState(
  storageKey: string | undefined,
  state: SplitLayoutState,
): Promise<void> {
  if (!storageKey) return;

  if (isInvokeAvailable()) {
    try {
      await store.commonSet(storageKey, state);
      await store.commonSave();
      return;
    } catch {
      return;
    }
  }

  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    /* empty */
  }
}
