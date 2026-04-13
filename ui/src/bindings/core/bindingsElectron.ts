const isElectron = window.api && (window.api as any).invoke != null;

const api = (window.api as any)?.invoke;

export const invoke = async (
  key: string,
  args?: string | null | undefined,
): Promise<string | null | undefined> => {
  if (!isElectron) throw new Error('not in node env');
  return await api.invoke(key, args);
};

export const getCommandKeys = async (): Promise<string[]> => {
  if (!isElectron) throw new Error('not in node env');
  return await api.getCommandKeys();
};

export const getCommandLen = async (): Promise<number> => {
  if (!isElectron) throw new Error('not in node env');
  return await api.getCommandLen();
};

export const invokeAsync = async (
  key: string,
  args?: string | null | undefined,
): Promise<string | null | undefined> => {
  if (!isElectron) throw new Error('not in node env');
  return await api.invokeAsync(key, args);
};

export const getCommandAsyncKeys = async (): Promise<string[]> => {
  if (!isElectron) throw new Error('not in node env');
  return await api.getCommandAsyncKeys();
};

export const getCommandAsyncLen = async (): Promise<number> => {
  if (!isElectron) throw new Error('not in node env');
  return await api.getCommandAsyncLen();
};

export const regJsFunction = async (
  key: string,
  callback: (args: string | null | undefined) => Promise<string | null | undefined>,
) => {
  if (!isElectron) throw new Error('not in node env');
  return await api.regJsFunction(key, callback);
};

export const unregJsFunction = async (key: string) => {
  if (!isElectron) throw new Error('not in node env');
  return await api.unregJsFunction(key);
};

export const clearJsFunction = async () => {
  if (!isElectron) throw new Error('not in node env');
  return await api.clearJsFunction();
};

export const getCommandJsKeys = async (): Promise<string[]> => {
  if (!isElectron) throw new Error('not in node env');
  return await api.getCommandJsKeys();
};

export const getCommandJsLen = async (): Promise<number> => {
  if (!isElectron) throw new Error('not in node env');
  return await api.getCommandJsLen();
};

export { isElectron };
