const isNode = window.api && window.api.invoke != null;
const isElectron = isNode;

export const invoke = async (
  key: string,
  args?: string | null | undefined,
): Promise<string | null | undefined> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.invoke.invoke(key, args);
};

export const getCommandKeys = async (): Promise<string[]> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.invoke.getCommandKeys();
};

export const getCommandLen = async (): Promise<number> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.invoke.getCommandLen();
};

export const invokeAsync = async (
  key: string,
  args?: string | null | undefined,
): Promise<string | null | undefined> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.invoke.invokeAsync(key, args);
};

export const getCommandAsyncKeys = async (): Promise<string[]> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.invoke.getCommandAsyncKeys();
};

export const getCommandAsyncLen = async (): Promise<number> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.invoke.getCommandAsyncLen();
};

export const regJsFunction = async (
  key: string,
  callback: (args: string | null | undefined) => Promise<string | null | undefined>,
) => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.invoke.regJsFunction(key, callback);
};

export const unregJsFunction = async (key: string) => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.invoke.unregJsFunction(key);
};

export const clearJsFunction = async () => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.invoke.clearJsFunction();
};

export const getCommandJsKeys = async (): Promise<string[]> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.invoke.getCommandJsKeys();
};

export const getCommandJsLen = async (): Promise<number> => {
  if (!isNode || !window.api) throw new Error('not in node env');
  return await window.api.invoke.getCommandJsLen();
};

export { isNode, isElectron };
