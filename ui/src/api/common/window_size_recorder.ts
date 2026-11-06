export type WindowSize = { width: number; height: number };

const sameSize = (first: WindowSize, second: WindowSize) =>
  Math.abs(first.width - second.width) < 1 && Math.abs(first.height - second.height) < 1;

/** 只记录本窗口实际调整产生的普通逻辑尺寸；共享快照不会成为待提交值。 */
export function createWindowSizeRecorder(
  initialSize: WindowSize,
  save: (size: WindowSize) => Promise<void>,
) {
  let previous = initialSize;
  let pending: WindowSize | null = null;
  let saving: Promise<void> | null = null;
  const flush = (): Promise<void> => {
    if (saving) return saving;
    saving = (async () => {
      while (pending) {
        const current = pending;
        await save(current);
        if (pending === current) pending = null;
      }
    })().finally(() => {
      saving = null;
    });
    return saving;
  };
  return {
    record(size: WindowSize, ordinary: boolean): boolean {
      if (
        !ordinary ||
        !Number.isFinite(size.width) ||
        !Number.isFinite(size.height) ||
        size.width <= 0 ||
        size.height <= 0
      )
        return false;
      if (sameSize(previous, size)) return false;
      previous = size;
      pending = size;
      return true;
    },
    disable() {
      pending = null;
    },
    flush,
  };
}

const flushers = new Set<() => Promise<void>>();
export function registerWindowSizeFlusher(flush: () => Promise<void>): () => void {
  flushers.add(flush);
  return () => {
    flushers.delete(flush);
  };
}
export async function flushWindowSize(): Promise<void> {
  await Promise.all([...flushers].map((flush) => flush()));
}
