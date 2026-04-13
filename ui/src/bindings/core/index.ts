import * as electron from './bindingsElectron';
import * as tauri from './bindingsTauri';

const { isElectron } = electron;
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
  if (isTauri) {
    res = await tauri.invoke(key, getJson(args));
  } else if (isElectron) {
    res = await electron.invoke(key, getJson(args));
  } else {
    throw new Error('invoke error: unknow env');
  }
  return getObject(res);
};

export const getCommandKeys = async (): Promise<string[]> => {
  if (isTauri) {
    // return await tauri.getCommandKeys();
  } else if (isElectron) {
    return await electron.getCommandKeys();
  }
  throw new Error('invoke error: unknow env');
};

export const getCommandLen = async (): Promise<number> => {
  if (isTauri) {
    // return await tauri.getCommandLen();
  } else if (isElectron) {
    return await electron.getCommandLen();
  }
  throw new Error('invoke error: unknow env');
};

export const invokeAsync = async <T>(key: string, args?: any): Promise<T | undefined> => {
  let res: string | null | undefined;
  if (isTauri) {
    // res = await tauri.invokeAsync(key, getJson(args));
  } else if (isElectron) {
    res = await electron.invokeAsync(key, getJson(args));
  } else {
    throw new Error('invoke error: unknow env');
  }
  return getObject(res);
};

export const getCommandAsyncKeys = async (): Promise<string[]> => {
  if (isTauri) {
    // return await tauri.getCommandAsyncKeys();
  } else if (isElectron) {
    return await electron.getCommandAsyncKeys();
  }
  throw new Error('invoke error: unknow env');
};

export const getCommandAsyncLen = async (): Promise<number> => {
  if (isTauri) {
    // return await tauri.getCommandAsyncLen();
  } else if (isElectron) {
    return await electron.getCommandAsyncLen();
  }
  throw new Error('invoke error: unknow env');
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
  if (isTauri) {
    // return await tauri.regJsFunction(key, handle);
  } else if (isElectron) {
    return await electron.regJsFunction(key, handle);
  }
  throw new Error('regJsFunction error: unknow env');
};

export const unregJsFunction = async (key: string) => {
  if (isTauri) {
    // return await tauri.unregJsFunction(key);
  } else if (isElectron) {
    return await electron.unregJsFunction(key);
  }
  throw new Error('unregJsFunctionNode error: unknow env');
};

export const clearJsFunction = async () => {
  if (isTauri) {
    // return await tauri.clearJsFunction();
  } else if (isElectron) {
    return await electron.clearJsFunction();
  }
  throw new Error('clearJsFunctionNode error: unknow env');
};

export const getCommandJsKeys = async (): Promise<string[]> => {
  if (isTauri) {
    // return await tauri.getCommandJsKeys();
  } else if (isElectron) {
    return await electron.getCommandJsKeys();
  }
  throw new Error('invoke error: unknow env');
};

export const getCommandJsLen = async (): Promise<number> => {
  if (isTauri) {
    // return await tauri.getCommandJsLen();
  } else if (isElectron) {
    return await electron.getCommandJsLen();
  }
  throw new Error('invoke error: unknow env');
};

export { isElectron };
