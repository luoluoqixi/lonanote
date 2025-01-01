const isNode = window.api && window.api.invoke != null;
const isElectron = isNode;

export const invoke = async (
  key: string,
  args?: string | null | undefined,
): Promise<string | null | undefined> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.invoke(key, args);
};

export const getCommandKeys = async (): Promise<string[]> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.getCommandKeys();
};

export const getCommandLen = async (): Promise<number> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.getCommandLen();
};

export const invokeAsync = async (
  key: string,
  args?: string | null | undefined,
): Promise<string | null | undefined> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.invokeAsync(key, args);
};

export const getCommandAsyncKeys = async (): Promise<string[]> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.getCommandAsyncKeys();
};

export const getCommandAsyncLen = async (): Promise<number> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.getCommandAsyncLen();
};

export const regJsFunction = async (
  key: string,
  callback: (args: string | null | undefined) => Promise<string | null | undefined>,
) => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.regJsFunction(key, callback);
};

export const unregJsFunction = async (key: string) => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.unregJsFunction(key);
};

export const clearJsFunction = async () => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.clearJsFunction();
};

export const getCommandJsKeys = async (): Promise<string[]> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.getCommandJsKeys();
};

export const getCommandJsLen = async (): Promise<number> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.getCommandJsLen();
};

export { isNode, isElectron };
