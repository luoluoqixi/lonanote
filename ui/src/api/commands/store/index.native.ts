import { File } from "expo-file-system";

import { createCommonStoreSync } from "@/api/common/common_store_sync";
import { getAppDataDirectory, nativePathToFileUri } from "@/api/common/storage_paths.native";
import { isInvokeAvailable } from "@/api/invoke";

import { store as asyncStore } from "./store";
import { COMMON_STORE_FILE_NAME, STORE_COMMON_KEY } from "./store_constants";
import { type StoreRecord, createStoreCache, parseStoreRecord } from "./store_shared";
import type { UnifiedStore } from "./store_types";

function ensureCommonStoreKey(storeKey: string): void {
  if (storeKey !== STORE_COMMON_KEY) {
    throw new Error(`[store] sync store only supports ${STORE_COMMON_KEY}, got ${storeKey}`);
  }
}

function commonStoreFileAt(directoryPath: string): File {
  return new File(nativePathToFileUri(directoryPath), COMMON_STORE_FILE_NAME);
}

function getCommonStoreFile(): File {
  return commonStoreFileAt(getAppDataDirectory());
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
  void data;
}

const commonStoreCache = createStoreCache({
  fileName: () => COMMON_STORE_FILE_NAME,
  filePath: () => getCommonStoreFile().uri,
  load: loadCommonStoreRecord,
  save: saveCommonStoreRecord,
});

const commonStoreSync = createCommonStoreSync({
  cache: commonStoreCache,
  isRemote: isInvokeAvailable,
  patchRemote: asyncStore.commonPatchAndSave,
  persistCommitted: saveCommonStoreRecord,
});

function scheduleCommonFlush(): void {
  void commonStoreSync.flush().catch((error) => {
    console.error("[store] failed to flush CommonStore patch", error);
  });
}

function getCache(storeKey: string) {
  ensureCommonStoreKey(storeKey);
  return commonStoreCache;
}

export const store: UnifiedStore = {
  commonSnapshot: async () => {
    const snapshot = isInvokeAvailable()
      ? await asyncStore.commonSnapshot()
      : commonStoreSync.getSnapshot();
    commonStoreSync.applySnapshot(snapshot);
    return snapshot;
  },
  applyCommonSnapshot: (snapshot) => {
    commonStoreSync.applySnapshot(snapshot);
  },
  flushCommonStore: () => commonStoreSync.flush(),
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
    if (storeKey === STORE_COMMON_KEY && isInvokeAvailable()) {
      commonStoreSync.applySnapshot(await asyncStore.commonSnapshot());
      return;
    }
    store.reloadSync(storeKey);
  },
  reloadSync: (storeKey) => {
    const cache = getCache(storeKey);
    cache.reload();
    commonStoreSync.applyCommitted(cache.all());
  },
  save: async (storeKey) => {
    ensureCommonStoreKey(storeKey);
    await commonStoreSync.flush();
  },
  saveSync: (storeKey) => {
    ensureCommonStoreKey(storeKey);
    scheduleCommonFlush();
  },
  clear: async (storeKey) => {
    ensureCommonStoreKey(storeKey);
    commonStoreSync.clear();
    await commonStoreSync.flush();
  },
  clearSync: (storeKey) => {
    ensureCommonStoreKey(storeKey);
    commonStoreSync.clear();
  },
  delete: async (storeKey, key) => {
    ensureCommonStoreKey(storeKey);
    const deleted = commonStoreSync.remove(key);
    await commonStoreSync.flush();
    return deleted;
  },
  deleteSync: (storeKey, key) => {
    ensureCommonStoreKey(storeKey);
    return commonStoreSync.remove(key);
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
    ensureCommonStoreKey(storeKey);
    commonStoreSync.set(key, val);
    await commonStoreSync.flush();
  },
  setSync: (storeKey, key, val) => {
    ensureCommonStoreKey(storeKey);
    commonStoreSync.set(key, val);
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
