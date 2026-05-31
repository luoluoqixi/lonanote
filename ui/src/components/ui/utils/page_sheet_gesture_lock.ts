import { useSyncExternalStore } from "react";

let pageSheetGestureLockCount = 0;
const listeners = new Set<() => void>();

function emitPageSheetGestureLockChange() {
  listeners.forEach((listener) => listener());
}

function subscribePageSheetGestureLock(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getPageSheetGestureLockSnapshot() {
  return pageSheetGestureLockCount > 0;
}

export function acquirePageSheetGestureLock() {
  pageSheetGestureLockCount += 1;
  emitPageSheetGestureLockChange();
}

export function releasePageSheetGestureLock() {
  pageSheetGestureLockCount = Math.max(0, pageSheetGestureLockCount - 1);
  emitPageSheetGestureLockChange();
}

export function usePageSheetGestureLockActive(): boolean {
  return useSyncExternalStore(
    subscribePageSheetGestureLock,
    getPageSheetGestureLockSnapshot,
    getPageSheetGestureLockSnapshot,
  );
}
