import * as lonnanote from 'lonanote-core-node';

export const init = () => {
  const error = lonnanote.init();
  if (error != null) {
    throw new Error(error);
  }
};

export const invoke = (
  key: string,
  args?: string | null | undefined,
): string | null | undefined => {
  const res = lonnanote.invoke(key, args);
  return res;
};

export const getCommandKeys = (): string[] => {
  return lonnanote.getCommandKeys();
};

export const getCommandLen = (): number => {
  return Number(lonnanote.getCommandLen());
};

export const invokeAsync = async (
  key: string,
  args?: string | null | undefined,
): Promise<string | null | undefined> => {
  const res = await lonnanote.invokeAsync(key, args);
  return res;
};

export const getCommandAsyncKeys = (): string[] => {
  return lonnanote.getCommandAsyncKeys();
};

export const getCommandAsyncLen = (): number => {
  return Number(lonnanote.getCommandAsyncLen());
};

export const regJsFunction = (
  key: string,
  callback: (args: string | null | undefined) => Promise<string | null | undefined>,
): void => {
  lonnanote.regJsFunction(key, callback);
};

export const unregJsFunction = (key: string): void => {
  lonnanote.unregJsFunction(key);
};

export const clearJsFunction = (): void => {
  lonnanote.clearJsFunction();
};

export const getCommandJsKeys = (): string[] => {
  return lonnanote.getCommandJsKeys();
};

export const getCommandJsLen = (): number => {
  return Number(lonnanote.getCommandJsLen());
};
