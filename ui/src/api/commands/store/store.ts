import { invoke } from "@/api/invoke";

const invokeStore = <T = unknown>(command: string, args?: Record<string, unknown>) => {
  return invoke<T>(`store.${command}`, args);
};

const normalizeOptional = <T>(value: T | null | undefined): T | undefined => {
  return value ?? undefined;
};

export const store = {
  filePath: async (storeKey: string): Promise<string> => {
    return (await invokeStore("file_path", { storeKey }))!;
  },
  fileName: async (storeKey: string): Promise<string> => {
    return (await invokeStore("file_name", { storeKey }))!;
  },
  reload: async (storeKey: string): Promise<void> => {
    return (await invokeStore("reload", { storeKey }))!;
  },
  save: async (storeKey: string): Promise<void> => {
    return (await invokeStore("save", { storeKey }))!;
  },
  clear: async (storeKey: string): Promise<void> => {
    return (await invokeStore("clear", { storeKey }))!;
  },
  delete: async (storeKey: string, key: string): Promise<boolean> => {
    return (await invokeStore("delete", { storeKey, key }))!;
  },
  has: async (storeKey: string, key: string): Promise<boolean> => {
    return (await invokeStore("has", { storeKey, key }))!;
  },
  get: async <T = unknown>(storeKey: string, key: string): Promise<T | undefined> => {
    return normalizeOptional(await invokeStore<T | null>("get", { storeKey, key }));
  },
  set: async (storeKey: string, key: string, val: unknown): Promise<void> => {
    return (await invokeStore("set", { storeKey, key, val }))!;
  },
  keys: async (storeKey: string): Promise<string[]> => {
    return (await invokeStore("keys", { storeKey }))!;
  },
  values: async <T = unknown>(storeKey: string): Promise<T[]> => {
    return (await invokeStore("values", { storeKey }))!;
  },
  len: async (storeKey: string): Promise<number> => {
    return (await invokeStore("len", { storeKey }))!;
  },
  isEmpty: async (storeKey: string): Promise<boolean> => {
    return (await invokeStore("is_empty", { storeKey }))!;
  },
  all: async <T = unknown>(storeKey: string): Promise<Record<string, T>> => {
    return (await invokeStore("all", { storeKey }))!;
  },
  commonFilePath: async (): Promise<string> => {
    return (await invokeStore("common_file_path"))!;
  },
  commonFileName: async (): Promise<string> => {
    return (await invokeStore("common_file_name"))!;
  },
  commonReload: async (): Promise<void> => {
    return (await invokeStore("common_reload"))!;
  },
  commonSave: async (): Promise<void> => {
    return (await invokeStore("common_save"))!;
  },
  commonClear: async (): Promise<void> => {
    return (await invokeStore("common_clear"))!;
  },
  commonDelete: async (key: string): Promise<boolean> => {
    return (await invokeStore("common_delete", { key }))!;
  },
  commonHas: async (key: string): Promise<boolean> => {
    return (await invokeStore("common_has", { key }))!;
  },
  commonGet: async <T = unknown>(key: string): Promise<T | undefined> => {
    return normalizeOptional(await invokeStore<T | null>("common_get", { key }));
  },
  commonSet: async (key: string, val: unknown): Promise<void> => {
    return (await invokeStore("common_set", { key, val }))!;
  },
  commonKeys: async (): Promise<string[]> => {
    return (await invokeStore("common_keys"))!;
  },
  commonValues: async <T = unknown>(): Promise<T[]> => {
    return (await invokeStore("common_values"))!;
  },
  commonLen: async (): Promise<number> => {
    return (await invokeStore("common_len"))!;
  },
  commonIsEmpty: async (): Promise<boolean> => {
    return (await invokeStore("common_is_empty"))!;
  },
  commonAll: async <T = unknown>(): Promise<Record<string, T>> => {
    return (await invokeStore("common_all"))!;
  },
};
