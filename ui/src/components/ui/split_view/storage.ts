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

export function readSplitLayoutState(storageKey?: string): SplitLayoutState | undefined {
  if (!storageKey || !canUseLocalStorage()) return undefined;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as Partial<SplitLayoutState>;
    if (!isFiniteNumberArray(parsed.sizes) || !isBooleanArray(parsed.visible)) return undefined;

    return {
      sizes: parsed.sizes,
      visible: parsed.visible,
    };
  } catch {
    return undefined;
  }
}

export function writeSplitLayoutState(storageKey: string | undefined, state: SplitLayoutState) {
  if (!storageKey || !canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {}
}
