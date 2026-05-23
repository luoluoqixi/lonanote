import { store } from "@/api/common";

import type { SplitLayoutState } from "./types";

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

  try {
    return parseSplitLayoutState(store.commonGetSync(storageKey));
  } catch {
    return undefined;
  }
}

export async function writeSplitLayoutState(
  storageKey: string | undefined,
  state: SplitLayoutState,
): Promise<void> {
  if (!storageKey) return;

  try {
    store.commonSetSync(storageKey, state);
    store.commonSaveSync();
  } catch {
    /* empty */
  }
}
