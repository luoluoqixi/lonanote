import type { ConfigSnapshot } from "./config_sync_state";

export type CommonStoreValues = Record<string, unknown>;
export type CommonStoreSnapshot = ConfigSnapshot<CommonStoreValues>;

export interface CommonStoreCache {
  all: () => CommonStoreValues;
  replace: (values: CommonStoreValues) => void;
  set: (key: string, value: unknown) => void;
  delete: (key: string) => boolean;
  save: () => void;
}

export interface CommonStorePatch {
  set: CommonStoreValues;
  remove: string[];
}

interface CommonStoreSyncOptions {
  cache: CommonStoreCache;
  isRemote: () => boolean;
  patchRemote: (patch: CommonStorePatch) => Promise<CommonStoreSnapshot>;
  persistCommitted: (values: CommonStoreValues) => void;
}

type DirtyValue = { sequence: number; value: unknown } | { sequence: number; removed: true };

function projectValues(
  committed: CommonStoreValues,
  dirty: Map<string, DirtyValue>,
): CommonStoreValues {
  const values = { ...committed };
  for (const [key, operation] of dirty) {
    if ("removed" in operation) {
      delete values[key];
    } else {
      values[key] = operation.value;
    }
  }
  return values;
}

export function createCommonStoreSync(options: CommonStoreSyncOptions) {
  let committed = options.cache.all();
  let runtimeId: string | null = null;
  let revision = -1;
  let nextSequence = 0;
  const dirty = new Map<string, DirtyValue>();
  let flushPromise: Promise<void> | null = null;

  const refreshCache = () => options.cache.replace(projectValues(committed, dirty));

  const applySnapshot = (snapshot: CommonStoreSnapshot): boolean => {
    if (runtimeId === snapshot.runtimeId && snapshot.revision <= revision) {
      return false;
    }
    runtimeId = snapshot.runtimeId;
    revision = snapshot.revision;
    committed = { ...snapshot.values };
    refreshCache();
    options.persistCommitted(committed);
    return true;
  };

  const set = (key: string, value: unknown) => {
    options.cache.set(key, value);
    dirty.set(key, { sequence: ++nextSequence, value });
  };

  const remove = (key: string): boolean => {
    const existed = options.cache.delete(key);
    if (existed || Object.prototype.hasOwnProperty.call(committed, key)) {
      dirty.set(key, { sequence: ++nextSequence, removed: true });
    }
    return existed;
  };

  const clear = () => {
    const all = projectValues(committed, dirty);
    for (const key of Object.keys(all)) {
      dirty.set(key, { sequence: ++nextSequence, removed: true });
    }
    options.cache.replace({});
  };

  const flush = (): Promise<void> => {
    if (flushPromise) {
      return flushPromise;
    }
    flushPromise = (async () => {
      while (dirty.size > 0) {
        const batch = new Map(dirty);
        const patch: CommonStorePatch = { set: {}, remove: [] };
        for (const [key, operation] of batch) {
          if ("removed" in operation) {
            patch.remove.push(key);
          } else {
            patch.set[key] = operation.value;
          }
        }
        if (options.isRemote()) {
          try {
            const snapshot = await options.patchRemote(patch);
            applySnapshot(snapshot);
          } catch (error) {
            for (const [key, operation] of batch) {
              if (dirty.get(key)?.sequence === operation.sequence) {
                dirty.delete(key);
              }
            }
            refreshCache();
            throw error;
          }
        } else {
          committed = projectValues(committed, batch);
          revision += 1;
          options.persistCommitted(committed);
        }
        for (const [key, operation] of batch) {
          if (dirty.get(key)?.sequence === operation.sequence) {
            dirty.delete(key);
          }
        }
        refreshCache();
      }
    })().finally(() => {
      flushPromise = null;
    });
    return flushPromise;
  };

  const applyCommitted = (values: CommonStoreValues) => {
    committed = { ...values };
    refreshCache();
  };

  const getSnapshot = (): CommonStoreSnapshot => ({
    runtimeId: runtimeId ?? "local",
    revision: Math.max(0, revision),
    values: { ...committed },
  });

  return {
    applyCommitted,
    applySnapshot,
    clear,
    flush,
    getCommitted: () => ({ ...committed }),
    getDirtyKeys: () => [...dirty.keys()],
    getSnapshot,
    remove,
    set,
  };
}
