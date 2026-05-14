export type StoreRecord = Record<string, unknown>;

export interface StoreSyncBackend {
  fileName: () => string | undefined;
  filePath: () => string | undefined;
  load: () => StoreRecord;
  save: (data: StoreRecord) => void;
}

export interface StoreCache {
  fileName: () => string | undefined;
  filePath: () => string | undefined;
  reload: () => void;
  save: () => void;
  clear: () => void;
  delete: (key: string) => boolean;
  has: (key: string) => boolean;
  get: <T = unknown>(key: string) => T | undefined;
  set: (key: string, value: unknown) => void;
  keys: () => string[];
  values: <T = unknown>() => T[];
  len: () => number;
  isEmpty: () => boolean;
  all: <T = unknown>() => Record<string, T>;
}

export function normalizeStoreRecord(value: unknown): StoreRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as StoreRecord) };
}

export function parseStoreRecord(raw: string | null | undefined): StoreRecord {
  if (!raw) {
    return {};
  }

  try {
    return normalizeStoreRecord(JSON.parse(raw));
  } catch (error) {
    console.error("[store] failed to parse persisted data", error);
    return {};
  }
}

export function createStoreCache(backend: StoreSyncBackend): StoreCache {
  let data = normalizeStoreRecord(backend.load());

  return {
    fileName: backend.fileName,
    filePath: backend.filePath,
    reload: () => {
      data = normalizeStoreRecord(backend.load());
    },
    save: () => {
      backend.save(data);
    },
    clear: () => {
      data = {};
    },
    delete: (key) => {
      if (!Object.prototype.hasOwnProperty.call(data, key)) {
        return false;
      }

      delete data[key];
      return true;
    },
    has: (key) => {
      return Object.prototype.hasOwnProperty.call(data, key);
    },
    get: <T = unknown>(key: string): T | undefined => {
      return data[key] as T | undefined;
    },
    set: (key, value) => {
      data[key] = value;
    },
    keys: () => {
      return Object.keys(data);
    },
    values: <T = unknown>(): T[] => {
      return Object.values(data) as T[];
    },
    len: () => {
      return Object.keys(data).length;
    },
    isEmpty: () => {
      return Object.keys(data).length === 0;
    },
    all: <T = unknown>(): Record<string, T> => {
      return { ...(data as Record<string, T>) };
    },
  };
}
