import { File, Paths } from "expo-file-system";

import { store as asyncStore } from "@/api/commands/store/store";
import { isInvokeAvailable } from "@/api/invoke";

import { COMMON_STORE_FILE_NAME, STORE_COMMON_KEY } from "./store_constants";
import { type StoreRecord, createStoreCache, parseStoreRecord } from "./store_shared";
import type { UnifiedStore } from "./store_types";

function ensureCommonStoreKey(storeKey: string): void {
  if (storeKey !== STORE_COMMON_KEY) {
    throw new Error(`[store] sync store only supports ${STORE_COMMON_KEY}, got ${storeKey}`);
  }
}

function getCommonStoreFile() {
  return new File(Paths.document, COMMON_STORE_FILE_NAME);
}

function loadCommonStoreRecord(): StoreRecord {
  try {
    const file = getCommonStoreFile();
    if (!file.exists) {
      return {};
    }

    return parseStoreRecord(file.textSync());
  } catch (error) {
    console.error("[store] failed to read common store file", error);
    return {};
  }
}

function saveCommonStoreRecord(data: StoreRecord): void {
  try {
    const file = getCommonStoreFile();
    if (!file.exists) {
      file.create({ intermediates: true });
    }

    file.write(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("[store] failed to persist common store file", error);
  }
}

const commonStoreCache = createStoreCache({
  fileName: () => COMMON_STORE_FILE_NAME,
  filePath: () => getCommonStoreFile().uri,
  load: loadCommonStoreRecord,
  save: saveCommonStoreRecord,
});

let requestedMirrorRevision = 0;
let completedMirrorRevision = 0;
let pendingMirror: { revision: number; snapshot: StoreRecord } | null = null;
let mirrorInFlight: Promise<void> | null = null;
const mirrorWaiters = new Map<number, Array<() => void>>();

async function mirrorStoreSnapshot(storeKey: string, snapshot: StoreRecord): Promise<void> {
  await asyncStore.clear(storeKey);
  const entries = Object.entries(snapshot);
  await Promise.all(entries.map(([key, value]) => asyncStore.set(storeKey, key, value)));
  await asyncStore.save(storeKey);
}

function resolveMirrorWaiters(): void {
  for (const [revision, waiters] of mirrorWaiters.entries()) {
    if (revision > completedMirrorRevision) {
      continue;
    }

    mirrorWaiters.delete(revision);
    waiters.forEach((resolve) => resolve());
  }
}

function ensureMirrorLoop(storeKey: string): void {
  if (mirrorInFlight) {
    return;
  }

  mirrorInFlight = (async () => {
    while (pendingMirror) {
      const nextMirror = pendingMirror;
      pendingMirror = null;

      try {
        await mirrorStoreSnapshot(storeKey, nextMirror.snapshot);
      } catch (error) {
        console.error("[store] failed to mirror async mutation", error);
      } finally {
        completedMirrorRevision = Math.max(completedMirrorRevision, nextMirror.revision);
        resolveMirrorWaiters();
      }
    }
  })().finally(() => {
    mirrorInFlight = null;
    if (pendingMirror) {
      ensureMirrorLoop(storeKey);
    }
  });
}

function scheduleAsyncMirror(storeKey: string, snapshot: StoreRecord): Promise<void> {
  if (!isInvokeAvailable()) {
    return Promise.resolve();
  }

  const revision = ++requestedMirrorRevision;
  pendingMirror = {
    revision,
    snapshot,
  };

  const promise = new Promise<void>((resolve) => {
    const waiters = mirrorWaiters.get(revision) ?? [];
    waiters.push(resolve);
    mirrorWaiters.set(revision, waiters);
  });

  ensureMirrorLoop(storeKey);
  return promise;
}

function getCache(storeKey: string) {
  ensureCommonStoreKey(storeKey);
  return commonStoreCache;
}

export const store: UnifiedStore = {
  filePath: async (storeKey) => {
    return storeKey === STORE_COMMON_KEY && isInvokeAvailable()
      ? await asyncStore.filePath(storeKey)
      : getCache(storeKey).filePath();
  },
  filePathSync: (storeKey) => {
    return getCache(storeKey).filePath();
  },
  fileName: async (storeKey) => {
    return storeKey === STORE_COMMON_KEY && isInvokeAvailable()
      ? await asyncStore.fileName(storeKey)
      : getCache(storeKey).fileName();
  },
  fileNameSync: (storeKey) => {
    return getCache(storeKey).fileName();
  },
  reload: async (storeKey) => {
    getCache(storeKey).reload();
  },
  reloadSync: (storeKey) => {
    getCache(storeKey).reload();
  },
  save: async (storeKey) => {
    const cache = getCache(storeKey);
    cache.save();
    await scheduleAsyncMirror(storeKey, cache.all());
  },
  saveSync: (storeKey) => {
    const cache = getCache(storeKey);
    cache.save();
    void scheduleAsyncMirror(storeKey, cache.all());
  },
  clear: async (storeKey) => {
    const cache = getCache(storeKey);
    cache.clear();
    cache.save();
    await scheduleAsyncMirror(storeKey, cache.all());
  },
  clearSync: (storeKey) => {
    getCache(storeKey).clear();
  },
  delete: async (storeKey, key) => {
    const cache = getCache(storeKey);
    const deleted = cache.delete(key);
    cache.save();
    await scheduleAsyncMirror(storeKey, cache.all());
    return deleted;
  },
  deleteSync: (storeKey, key) => {
    return getCache(storeKey).delete(key);
  },
  has: async (storeKey, key) => {
    return getCache(storeKey).has(key);
  },
  hasSync: (storeKey, key) => {
    return getCache(storeKey).has(key);
  },
  get: async <T = unknown>(storeKey: string, key: string) => {
    return getCache(storeKey).get<T>(key);
  },
  getSync: <T = unknown>(storeKey: string, key: string) => {
    return getCache(storeKey).get<T>(key);
  },
  set: async (storeKey, key, val) => {
    const cache = getCache(storeKey);
    cache.set(key, val);
    cache.save();
    await scheduleAsyncMirror(storeKey, cache.all());
  },
  setSync: (storeKey, key, val) => {
    getCache(storeKey).set(key, val);
  },
  keys: async (storeKey) => {
    return getCache(storeKey).keys();
  },
  keysSync: (storeKey) => {
    return getCache(storeKey).keys();
  },
  values: async <T = unknown>(storeKey: string) => {
    return getCache(storeKey).values<T>();
  },
  valuesSync: <T = unknown>(storeKey: string) => {
    return getCache(storeKey).values<T>();
  },
  len: async (storeKey) => {
    return getCache(storeKey).len();
  },
  lenSync: (storeKey) => {
    return getCache(storeKey).len();
  },
  isEmpty: async (storeKey) => {
    return getCache(storeKey).isEmpty();
  },
  isEmptySync: (storeKey) => {
    return getCache(storeKey).isEmpty();
  },
  all: async <T = unknown>(storeKey: string) => {
    return getCache(storeKey).all<T>();
  },
  allSync: <T = unknown>(storeKey: string) => {
    return getCache(storeKey).all<T>();
  },
  commonFilePath: async () => {
    return store.filePath(STORE_COMMON_KEY);
  },
  commonFilePathSync: () => {
    return store.filePathSync(STORE_COMMON_KEY);
  },
  commonFileName: async () => {
    return store.fileName(STORE_COMMON_KEY);
  },
  commonFileNameSync: () => {
    return store.fileNameSync(STORE_COMMON_KEY);
  },
  commonReload: async () => {
    await store.reload(STORE_COMMON_KEY);
  },
  commonReloadSync: () => {
    store.reloadSync(STORE_COMMON_KEY);
  },
  commonSave: async () => {
    await store.save(STORE_COMMON_KEY);
  },
  commonSaveSync: () => {
    store.saveSync(STORE_COMMON_KEY);
  },
  commonClear: async () => {
    await store.clear(STORE_COMMON_KEY);
  },
  commonClearSync: () => {
    store.clearSync(STORE_COMMON_KEY);
  },
  commonDelete: async (key) => {
    return await store.delete(STORE_COMMON_KEY, key);
  },
  commonDeleteSync: (key) => {
    return store.deleteSync(STORE_COMMON_KEY, key);
  },
  commonHas: async (key) => {
    return await store.has(STORE_COMMON_KEY, key);
  },
  commonHasSync: (key) => {
    return store.hasSync(STORE_COMMON_KEY, key);
  },
  commonGet: async <T = unknown>(key: string) => {
    return await store.get<T>(STORE_COMMON_KEY, key);
  },
  commonGetSync: <T = unknown>(key: string) => {
    return store.getSync<T>(STORE_COMMON_KEY, key);
  },
  commonSet: async (key, val) => {
    await store.set(STORE_COMMON_KEY, key, val);
  },
  commonSetSync: (key, val) => {
    store.setSync(STORE_COMMON_KEY, key, val);
  },
  commonKeys: async () => {
    return await store.keys(STORE_COMMON_KEY);
  },
  commonKeysSync: () => {
    return store.keysSync(STORE_COMMON_KEY);
  },
  commonValues: async <T = unknown>() => {
    return await store.values<T>(STORE_COMMON_KEY);
  },
  commonValuesSync: <T = unknown>() => {
    return store.valuesSync<T>(STORE_COMMON_KEY);
  },
  commonLen: async () => {
    return await store.len(STORE_COMMON_KEY);
  },
  commonLenSync: () => {
    return store.lenSync(STORE_COMMON_KEY);
  },
  commonIsEmpty: async () => {
    return await store.isEmpty(STORE_COMMON_KEY);
  },
  commonIsEmptySync: () => {
    return store.isEmptySync(STORE_COMMON_KEY);
  },
  commonAll: async <T = unknown>() => {
    return await store.all<T>(STORE_COMMON_KEY);
  },
  commonAllSync: <T = unknown>() => {
    return store.allSync<T>(STORE_COMMON_KEY);
  },
};

export { COMMON_STORE_FILE_NAME, STORE_COMMON_KEY } from "./store_constants";
export type { StoreCache, StoreRecord } from "./store_shared";
export type { UnifiedStore } from "./store_types";
