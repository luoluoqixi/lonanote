import { invoke as _invoke, isTauri as _isTauri } from '@tauri-apps/api/core';
import { UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

let listenMap: Record<string, UnlistenFn | undefined> | undefined = undefined;

export const isTauri = _isTauri();

const appWebview = isTauri ? getCurrentWebviewWindow() : undefined;

export const invoke = async (
  key: string,
  args?: string | null | undefined,
): Promise<string | null | undefined> => {
  if (!isTauri) throw new Error('not in tauri env');
  return await _invoke('invoke', { args }, { headers: { key } });
};

export const getCommandKeys = async (): Promise<string[]> => {
  if (!isTauri) throw new Error('not in tauri env');
  return await _invoke('get_command_keys');
};

export const getCommandLen = async (): Promise<number> => {
  if (!isTauri) throw new Error('not in tauri env');
  return await _invoke('get_command_len');
};

export const invokeAsync = async (
  key: string,
  args?: string | null | undefined,
): Promise<string | null | undefined> => {
  if (!isTauri) throw new Error('not in tauri env');
  return await _invoke('invoke_async', { args }, { headers: { key } });
};

export const getCommandAsyncKeys = async (): Promise<string[]> => {
  if (!isTauri) throw new Error('not in tauri env');
  return await _invoke('get_command_async_keys');
};

export const getCommandAsyncLen = async (): Promise<number> => {
  if (!isTauri) throw new Error('not in tauri env');
  return await _invoke('get_command_async_len');
};

export const regJsFunction = async (
  key: string,
  callback: (args: string | null | undefined) => Promise<string | null | undefined>,
) => {
  if (!isTauri || !appWebview) throw new Error('not in tauri env');
  const unlisten = await appWebview.listen<string>(key, async (e) => {
    const preload = e.payload;
    const jsResultEvent = `js_result:${key}:return`;
    const res = await callback(preload);
    appWebview.emit(jsResultEvent, res);
  });
  listenMap = listenMap || {};
  listenMap[key] = unlisten;
  await _invoke('reg_js_function', { key });
  return unlisten;
};

export const unregJsFunction = async (key: string) => {
  if (!isTauri) throw new Error('not in tauri env');
  if (listenMap && listenMap[key]) {
    listenMap[key]();
    listenMap[key] = undefined;
  }
  return await _invoke('unreg_js_function', { key });
};

export const clearJsFunction = async () => {
  if (!isTauri) throw new Error('not in tauri env');
  if (listenMap) {
    for (const key in listenMap) {
      if (listenMap[key]) {
        listenMap[key]();
        listenMap[key] = undefined;
      }
    }
  }
  return await _invoke('clear_js_function');
};

export const getCommandJsKeys = async (): Promise<string[]> => {
  if (!isTauri) throw new Error('not in tauri env');
  return await _invoke('get_command_js_keys');
};

export const getCommandJsLen = async (): Promise<number> => {
  if (!isTauri) throw new Error('not in tauri env');
  return await _invoke('get_command_js_len');
};
