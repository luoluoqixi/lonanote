import * as node from './bindingsNode';
import * as tauri from './bindingsTauri';

const { isNode } = node;
const { isTauri } = tauri;

const getJson = (args?: any) => {
  const t = typeof args;
  if (t === 'function' || t === 'undefined') {
    return undefined;
  }
  if (t === null) {
    return t;
  }
  return JSON.stringify(args);
};

const getObject = <T>(res: string | null | undefined): T | undefined => {
  if (typeof res !== 'string') {
    return undefined;
  }
  return JSON.parse(res);
};

export const invoke = async <T>(key: string, args?: any): Promise<T | undefined> => {
  let res: string | null | undefined;
  if (isNode) {
    res = await node.invoke(key, getJson(args));
  } else if (isTauri) {
    res = await tauri.invoke(key, getJson(args));
  } else {
    throw new Error('invoke error: unknow env');
  }
  return getObject(res);
};

export const getCommandKeys = async (): Promise<string[]> => {
  if (isNode) {
    return await node.getCommandKeys();
  } else if (isTauri) {
    return await tauri.getCommandKeys();
  } else {
    throw new Error('invoke error: unknow env');
  }
};

export const getCommandLen = async (): Promise<number> => {
  if (isNode) {
    return await node.getCommandLen();
  } else if (isTauri) {
    return await tauri.getCommandLen();
  } else {
    throw new Error('invoke error: unknow env');
  }
};

export const invokeAsync = async <T>(key: string, args?: any): Promise<T | undefined> => {
  let res: string | null | undefined;
  if (isNode) {
    res = await node.invokeAsync(key, getJson(args));
  } else if (isTauri) {
    res = await tauri.invokeAsync(key, getJson(args));
  } else {
    throw new Error('invoke error: unknow env');
  }
  return getObject(res);
};

export const getCommandAsyncKeys = async (): Promise<string[]> => {
  if (isNode) {
    return await node.getCommandAsyncKeys();
  } else if (isTauri) {
    return await tauri.getCommandAsyncKeys();
  } else {
    throw new Error('invoke error: unknow env');
  }
};

export const getCommandAsyncLen = async (): Promise<number> => {
  if (isNode) {
    return await node.getCommandAsyncLen();
  } else if (isTauri) {
    return await tauri.getCommandAsyncLen();
  } else {
    throw new Error('invoke error: unknow env');
  }
};

export const regJsFunction = async <T, TRet>(
  key: string,
  callback: (args: T | undefined) => Promise<TRet | undefined>,
) => {
  const handle = async (args: string | null | undefined) => {
    const data = getObject(args);
    const r = await callback(data as T);
    return getJson(r);
  };
  if (isNode) {
    return await node.regJsFunction(key, handle);
  } else if (isTauri) {
    return await tauri.regJsFunction(key, handle);
  } else {
    throw new Error('regJsFunction error: unknow env');
  }
};

export const unregJsFunction = async (key: string) => {
  if (isNode) {
    return await node.unregJsFunction(key);
  } else if (isTauri) {
    return await tauri.unregJsFunction(key);
  } else {
    throw new Error('unregJsFunctionNode error: unknow env');
  }
};

export const clearJsFunction = async () => {
  if (isNode) {
    return await node.clearJsFunction();
  } else if (isTauri) {
    return await tauri.clearJsFunction();
  } else {
    throw new Error('clearJsFunctionNode error: unknow env');
  }
};

export const getCommandJsKeys = async (): Promise<string[]> => {
  if (isNode) {
    return await node.getCommandJsKeys();
  } else if (isTauri) {
    return await tauri.getCommandJsKeys();
  } else {
    throw new Error('invoke error: unknow env');
  }
};

export const getCommandJsLen = async (): Promise<number> => {
  if (isNode) {
    return await node.getCommandJsLen();
  } else if (isTauri) {
    return await tauri.getCommandJsLen();
  } else {
    throw new Error('invoke error: unknow env');
  }
};

export { isNode, isTauri };
